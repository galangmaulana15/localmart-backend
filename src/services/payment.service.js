import { pool } from "../config/db.js";
import { ensureOrderPaymentStatusColumn } from "./orderSchema.service.js";
import { getOrCreateWalletService } from "./wallet.service.js";
import { createXenditInvoice } from "./xendit.service.js";

const toCustomerNameParts = (customer = {}) => {
  const fullName = String(customer.full_name || customer.name || customer.email || "Customer LocalMart").trim();
  const [givenNames, ...surnameParts] = fullName.split(" ");

  return {
    given_names: givenNames || "Customer",
    surname: surnameParts.join(" ") || "LocalMart",
    email: customer.email || "",
    mobile_number: customer.phone || customer.phone_number || "",
  };
};

const normalizeItems = (items = []) => {
  return items
    .map((item) => {
      const product = item.product || item;
      const quantity = Number(item.quantity || 1);
      const price = Number(product.price || item.price || 0);
      const productId = Number(product.id || item.product_id || item.id || 0);
      return {
        product_id: productId,
        quantity,
        price,
        subtotal: price * quantity,
        product_name: product.name || product.product_name || item.product_name || "Produk LocalMart",
        store_name: product.store_name || item.store_name || "Toko LocalMart",
        image_url: product.image_url || item.image_url || "",
        seller_id: product.seller_id || item.seller_id || null,
      };
    })
    .filter((item) => item.product_id && item.quantity > 0);
};

const loadItemsFromCart = async (client, userId) => {
  const cartResult = await client.query(
    `SELECT *
     FROM carts
     WHERE user_id = $1`,
    [userId]
  );

  if (cartResult.rows.length === 0) {
    throw new Error("Keranjang kosong");
  }

  const cartId = cartResult.rows[0].id;
  const itemsResult = await client.query(
    `SELECT
      ci.id AS cart_item_id,
      ci.product_id,
      ci.quantity,
      p.product_name,
      p.price,
      p.stock,
      p.store_id,
      s.seller_id,
      s.store_name,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.id ASC
        LIMIT 1
      ) AS image_url
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     JOIN stores s ON p.store_id = s.id
     WHERE ci.cart_id = $1`,
    [cartId]
  );

  if (itemsResult.rows.length === 0) {
    throw new Error("Keranjang kosong");
  }

  return {
    cartId,
    items: itemsResult.rows.map((item) => ({
      ...item,
      subtotal: Number(item.price || 0) * Number(item.quantity || 0),
      product_name: item.product_name,
    })),
  };
};

const loadItemsFromPayload = async (client, items = []) => {
  const normalizedItems = normalizeItems(items);
  if (normalizedItems.length === 0) {
    throw new Error("Item checkout tidak ditemukan");
  }

  const productIds = [...new Set(normalizedItems.map((item) => item.product_id))];
  const result = await client.query(
    `SELECT
      p.id,
      p.product_name,
      p.price,
      p.stock,
      p.store_id,
      s.seller_id,
      s.store_name,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.id ASC
        LIMIT 1
      ) AS image_url
     FROM products p
     JOIN stores s ON p.store_id = s.id
     WHERE p.id = ANY($1::int[])`,
    [productIds]
  );

  const productMap = new Map(result.rows.map((row) => [Number(row.id), row]));

  const finalItems = normalizedItems.map((item) => {
    const product = productMap.get(Number(item.product_id));
    if (!product) {
      throw new Error(`Produk ${item.product_id} tidak ditemukan`);
    }

    const price = Number(product.price || item.price || 0);
    const availableStock = Number(product.stock || 0);
    const requestedQuantity = Number(item.quantity || 1);

    if (availableStock <= 0) {
      throw new Error(`Stok ${product.product_name} habis`);
    }

    const quantity = Math.min(requestedQuantity, availableStock);

    return {
      cart_item_id: item.cart_item_id || null,
      product_id: Number(product.id),
      quantity,
      price,
      subtotal: price * quantity,
      product_name: product.product_name,
      store_id: product.store_id,
      seller_id: product.seller_id,
      store_name: product.store_name,
      image_url: product.image_url || "",
      adjusted: quantity !== requestedQuantity,
    };
  });

  return {
    cartId: null,
    items: finalItems,
  };
};

const creditSellerWallet = async (sellerId, amount, orderCode, paymentMethod) => {
  if (!sellerId || Number(amount) <= 0) return;

  const wallet = await getOrCreateWalletService(sellerId);
  await pool.query(
    `UPDATE wallets
     SET balance = balance + $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [amount, wallet.id]
  );

  await pool.query(
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
      'INCOME',
      $2,
      $3,
      'SUCCESS',
      $4
     )`,
    [
      wallet.id,
      paymentMethod,
      amount,
      `Penerimaan pesanan ${orderCode}`,
    ]
  );
};

const markOrderPaidAndCreditSeller = async (client, orderCode, paymentChannel = "") => {
  const orderResult = await client.query(
    `SELECT id, order_status, payment_method, payment_status
     FROM orders
     WHERE order_code = $1
     FOR UPDATE`,
    [orderCode]
  );

  if (orderResult.rows.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  const order = orderResult.rows[0];
  if (order.order_status === "PAID") {
    return order;
  }

  await client.query(
    `UPDATE orders
     SET order_status = 'PAID',
         payment_status = 'PAID',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [order.id]
  );

  const itemsResult = await client.query(
    `SELECT
      s.seller_id,
      SUM(oi.subtotal) AS seller_total
     FROM order_items oi
     JOIN stores s ON oi.store_id = s.id
     JOIN orders o ON oi.order_id = o.id
     WHERE o.order_code = $1
     GROUP BY s.seller_id`,
    [orderCode]
  );

  for (const row of itemsResult.rows) {
    await creditSellerWallet(row.seller_id, Number(row.seller_total || 0), orderCode, paymentChannel || order.payment_method || "Xendit");
  }

  return order;
};

export const createXenditCheckoutService = async (userId, payload = {}) => {
  await ensureOrderPaymentStatusColumn();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentMethod = String(payload.payment_method || payload.paymentMethod || "").trim();
    if (!paymentMethod) {
      throw new Error("Metode pembayaran wajib diisi");
    }

    const shippingAddress = String(payload.shipping_address || "").trim();
    if (!shippingAddress) {
      throw new Error("Alamat pengiriman wajib diisi");
    }

    const { cartId, items } = Array.isArray(payload.items) && payload.items.length > 0
      ? await loadItemsFromPayload(client, payload.items)
      : await loadItemsFromCart(client, userId);

    if (items.length === 0) {
      throw new Error("Keranjang kosong");
    }

    let totalAmount = 0;
    for (const item of items) {
      if (Number(item.quantity) <= 0) {
        throw new Error(`Quantity ${item.product_name} tidak valid`);
      }
      totalAmount += Number(item.price || 0) * Number(item.quantity || 0);
    }

    const orderCode = payload.order_code || `ORD-${Date.now()}`;
    const orderResult = await client.query(
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
        shippingAddress,
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
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
          item.subtotal,
        ]
      );

      await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    if (cartId) {
      const cartItemIds = items
        .map((item) => item.cart_item_id)
        .filter(Boolean);

      if (cartItemIds.length > 0) {
        await client.query(
          `DELETE FROM cart_items
           WHERE id = ANY($1::int[])`,
          [cartItemIds]
        );
      } else {
        await client.query(
          `DELETE FROM cart_items
           WHERE cart_id = $1`,
          [cartId]
        );
      }
    }

    await client.query("COMMIT");

    if (paymentMethod === "Wallet LocalMart") {
      const wallet = await getOrCreateWalletService(userId);
      if (Number(wallet.balance) < totalAmount) {
        throw new Error("Saldo wallet tidak mencukupi");
      }
      await pool.query(
        `UPDATE wallets
         SET balance = balance - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [totalAmount, wallet.id]
      );
      await pool.query(
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
          $2,
          $3,
          'SUCCESS',
          $4
         )`,
        [
          wallet.id,
          paymentMethod,
          totalAmount,
          `Pembayaran pesanan ${orderCode}`,
        ]
      );

      await markOrderPaidAndCreditSeller(client, orderCode, paymentMethod);

      const paidOrder = await pool.query(
        `SELECT *
         FROM orders
         WHERE id = $1`,
        [orderId]
      );

      return {
        order: paidOrder.rows[0],
        items,
        invoice_url: null,
        payment_method: paymentMethod,
      };
    }

    const invoice = await createXenditInvoice({
      externalId: orderCode,
      amount: totalAmount,
      description: `Checkout LocalMart ${orderCode}`,
      customer: toCustomerNameParts(payload.customer || {}),
      items: items.map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        category: "LocalMart",
        url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/products/${item.product_id}` : undefined,
      })),
      successRedirectUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/my-orders`,
      failureRedirectUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/my-orders`,
    });

    return {
      order: orderResult.rows[0],
      items,
      invoice_id: invoice.id,
      invoice_url: invoice.invoice_url,
      external_id: invoice.external_id,
      payment_method: paymentMethod,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const payOrderWithXenditService = async (userId, orderId) => {
  await ensureOrderPaymentStatusColumn();
  const orderResult = await pool.query(
    `SELECT
      id,
      order_code,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      shipping_address
     FROM orders
     WHERE id = $1
     AND user_id = $2`,
    [orderId, userId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  const order = orderResult.rows[0];
  if (order.order_status !== "PENDING") {
    throw new Error("Order sudah tidak bisa dibayar");
  }

  const itemsResult = await pool.query(
    `SELECT
      oi.product_id,
      oi.quantity,
      oi.price,
      oi.subtotal,
      oi.seller_id,
      p.product_name,
      s.store_name
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     JOIN stores s ON oi.store_id = s.id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  const invoice = await createXenditInvoice({
    externalId: order.order_code,
    amount: Number(order.total_amount || 0),
    description: `Checkout LocalMart ${order.order_code}`,
    customer: {},
    items: itemsResult.rows.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      category: "LocalMart",
      url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/products/${item.product_id}` : undefined,
    })),
    successRedirectUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/my-orders`,
    failureRedirectUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/my-orders`,
  });

  return {
    order,
    invoice_id: invoice.id,
    invoice_url: invoice.invoice_url,
    external_id: invoice.external_id,
  };
};

export const handleXenditWebhookService = async (payload = {}) => {
  await ensureOrderPaymentStatusColumn();

  const eventName = String(
    payload.event ||
    payload.name ||
    payload.data?.event ||
    payload.data?.status ||
    payload.status ||
    ""
  ).toLowerCase();
  const externalId = String(
    payload.external_id ||
    payload.data?.external_id ||
    payload.invoice?.external_id ||
    payload.data?.externalId ||
    payload.id ||
    ""
  ).trim();

  if (!externalId) {
    throw new Error("external_id webhook tidak ditemukan");
  }

  const isPaidEvent = eventName.includes("paid") || eventName.includes("settled") || eventName === "paid" || eventName === "settled";
  const isExpiredEvent = eventName.includes("expired") || eventName === "expired";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT id, order_code, order_status, payment_method, payment_status
       FROM orders
       WHERE order_code = $1
       FOR UPDATE`,
      [externalId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order tidak ditemukan");
    }

    const order = orderResult.rows[0];
    if (order.order_status === "PAID") {
      await client.query("COMMIT");
      return { order, skipped: true };
    }

    if (isPaidEvent) {
      await markOrderPaidAndCreditSeller(
        client,
        externalId,
        payload.payment_channel || payload.ewallet_type || order.payment_method || "Xendit"
      );
      await client.query("COMMIT");
      return { order: { ...order, order_status: "PAID", payment_status: "PAID" }, paid: true };
    }

    if (isExpiredEvent) {
      const stockRows = await client.query(
        `SELECT product_id, quantity
         FROM order_items
         WHERE order_id = $1`,
        [order.id]
      );

      for (const row of stockRows.rows) {
        await client.query(
          `UPDATE products
           SET stock = stock + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [row.quantity, row.product_id]
        );
      }

      await client.query(
        `UPDATE orders
         SET payment_status = 'EXPIRED',
             order_status = 'CANCELLED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [order.id]
      );

      await client.query("COMMIT");
      return { order: { ...order, order_status: "CANCELLED", payment_status: "EXPIRED" }, expired: true };
    }

    await client.query("COMMIT");
    return { order, skipped: true, event: eventName };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
