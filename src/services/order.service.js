import { pool } from "../config/db.js";
import { ensureOrderPaymentStatusColumn } from "./orderSchema.service.js";

export const checkoutService = async (
  userId,
  paymentMethod,
  shippingAddress
) => {
  await ensureOrderPaymentStatusColumn();

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const cartResult =
      await client.query(
        `SELECT *
         FROM carts
         WHERE user_id = $1`,
        [userId]
      );

    if (
      cartResult.rows.length === 0
    ) {
      throw new Error(
        "Keranjang kosong"
      );
    }

    const cartId =
      cartResult.rows[0].id;

    const itemsResult =
      await client.query(
        `SELECT
          ci.product_id,
          ci.quantity,
          p.price,
          p.stock,
          p.store_id
         FROM cart_items ci
         JOIN products p
         ON ci.product_id = p.id
         WHERE ci.cart_id = $1`,
        [cartId]
      );

    if (
      itemsResult.rows.length === 0
    ) {
      throw new Error(
        "Keranjang kosong"
      );
    }

    let totalAmount = 0;

    for (
      const item
      of itemsResult.rows
    ) {

      if (
        item.quantity >
        item.stock
      ) {
        throw new Error(
          "Stok produk tidak mencukupi"
        );
      }

      totalAmount +=
        Number(item.price)
        *
        item.quantity;

    }

    const orderCode =
      "ORD-" +
      Date.now();

    const orderResult =
      await client.query(
        `INSERT INTO orders
        (
          user_id,
          order_code,
          total_amount,
          payment_method,
          payment_status,
          order_status,
          shipping_address
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          'PENDING',
          'PENDING',
          $5
        )
        RETURNING *`,
        [
          userId,
          orderCode,
          totalAmount,
          paymentMethod,
          shippingAddress
        ]
      );

    const orderId =  orderResult.rows[0].id; 

        for (
      const item
      of itemsResult.rows
    ) {

      const subtotal =
        Number(item.price)
        *
        item.quantity;

      await client.query(
        `INSERT INTO order_items
        (
          order_id,
          product_id,
          store_id,
          quantity,
          price,
          subtotal
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )`,
        [
          orderId,
          item.product_id,
          item.store_id,
          item.quantity,
          item.price,
          subtotal
        ]
      );

      await client.query(
        `UPDATE products
         SET stock =
         stock - $1
         WHERE id = $2`,
        [
          item.quantity,
          item.product_id
        ]
      );

    }

        await client.query(
      `DELETE
       FROM cart_items
       WHERE cart_id = $1`,
      [cartId]
    );

    await client.query("COMMIT");

    return orderResult.rows[0];

  } catch (error) {

    await client.query(
      "ROLLBACK"
    );

    throw error;

  } finally {

    client.release();

  }

};

export const getMyOrdersService = async (userId) => {
  await ensureOrderPaymentStatusColumn();

  const result = await pool.query(
    `SELECT
      id,
      order_code,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      shipping_address,
      created_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};

export const getOrderByIdService = async (userId, orderId) => {
  await ensureOrderPaymentStatusColumn();

  const orderResult = await pool.query(
    `SELECT
      id,
      order_code,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      shipping_address,
      created_at
     FROM orders
     WHERE id = $1
     AND user_id = $2`,
    [orderId, userId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  const itemsResult = await pool.query(
    `SELECT
      oi.id,
      oi.product_id,
      p.product_name,
      oi.store_id,
      s.seller_id,
      oi.quantity,
      oi.price,
      oi.subtotal,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.id ASC
        LIMIT 1
      ) AS image_url
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     JOIN stores s ON oi.store_id = s.id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  return {
    order: orderResult.rows[0],
    items: itemsResult.rows
  };
};

export const payOrderWithWalletService = async (userId, orderId) => {
  await ensureOrderPaymentStatusColumn();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT *
       FROM orders
       WHERE id = $1
       AND user_id = $2
       FOR UPDATE`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order tidak ditemukan");
    }

    const order = orderResult.rows[0];

    if (order.order_status !== "PENDING") {
      throw new Error("Order sudah dibayar atau tidak bisa dibayar");
    }

    const walletResult = await client.query(
      `SELECT *
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (walletResult.rows.length === 0) {
      throw new Error("Wallet tidak ditemukan");
    }

    const wallet = walletResult.rows[0];

    if (Number(wallet.balance) < Number(order.total_amount)) {
      throw new Error("Saldo wallet tidak mencukupi");
    }

    const newBalance =
      Number(wallet.balance) - Number(order.total_amount);

    await client.query(
      `UPDATE wallets
       SET balance = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newBalance, wallet.id]
    );

    await client.query(
      `INSERT INTO wallet_transactions
       (
        wallet_id,
        transaction_type,
        payment_method,
        amount,
        status,
        description
       )
       VALUES
       (
        $1,
        'PAYMENT',
        'WALLET',
        $2,
        'SUCCESS',
        $3
       )`,
      [
        wallet.id,
        order.total_amount,
        `Pembayaran order ${order.order_code}`
      ]
    );

    const updatedOrder = await client.query(
      `UPDATE orders
       SET order_status = 'PAID',
           payment_status = 'PAID',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [orderId]
    );

    await client.query("COMMIT");

    return {
      order: updatedOrder.rows[0],
      wallet_balance: newBalance
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateOrderStatusService = async (orderId, status) => {
  await ensureOrderPaymentStatusColumn();

  const allowedStatus = [
    "PENDING",
    "PAID",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED"
  ];

  if (!allowedStatus.includes(status)) {
    throw new Error("Status order tidak valid");
  }

  const orderIdNum = Number(orderId)

  const currentOrder = await pool.query(
    `SELECT order_status FROM orders WHERE id = $1`,
    [orderIdNum]
  );

  if (currentOrder.rows.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  const currentStatus = currentOrder.rows[0].order_status;

  if (currentStatus === status) {
    return currentOrder.rows[0];
  }

  const allowedTransitions = {
    "PENDING": ["PAID", "CANCELLED"],
    "PAID": ["PROCESSING"],
    "PROCESSING": ["PACKED"],
    "PACKED": ["SHIPPED"],
    "SHIPPED": ["DELIVERED"],
    "DELIVERED": ["COMPLETED"],
  };

  const allowed = allowedTransitions[currentStatus];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(`Status tidak bisa diubah dari ${currentStatus} ke ${status}`);
  }

  let result
  if (status === 'CANCELLED' || status === 'PAID') {
    result = await pool.query(
      `UPDATE orders
       SET order_status = $1,
           payment_status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, status, orderIdNum]
    )
  } else {
    result = await pool.query(
      `UPDATE orders
       SET order_status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, orderIdNum]
    )
  }

  return result.rows[0];
};

export const getSellerOrdersService = async (sellerId) => {
  await ensureOrderPaymentStatusColumn();

  const result = await pool.query(
    `SELECT DISTINCT
      o.id,
      o.order_code,
      o.total_amount,
      o.payment_method,
      o.payment_status,
      o.order_status,
      o.shipping_address,
      o.created_at
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     JOIN stores s ON oi.store_id = s.id
     WHERE s.seller_id = $1
     ORDER BY o.created_at DESC`,
    [sellerId]
  );

  return result.rows;
};
