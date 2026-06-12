import { pool } from "../config/db.js";

export const addToCartService = async (
  userId,
  productId,
  quantity
) => {

  if (!productId || !quantity) {
    throw new Error(
      "Produk dan quantity wajib diisi"
    );
  }

  const productResult = await pool.query(
    `SELECT *
     FROM products
     WHERE id = $1
     AND is_active = TRUE`,
    [productId]
  );

  if (productResult.rows.length === 0) {
    throw new Error(
      "Produk tidak ditemukan"
    );
  }

  const product =
    productResult.rows[0];

  if (quantity > product.stock) {
    throw new Error(
      "Stok tidak mencukupi"
    );
  }

  let cartResult =
    await pool.query(
      `SELECT *
       FROM carts
       WHERE user_id = $1`,
      [userId]
    );

  let cartId;

  if (
    cartResult.rows.length === 0
  ) {

    const newCart =
      await pool.query(
        `INSERT INTO carts
        (user_id)
        VALUES ($1)
        RETURNING *`,
        [userId]
      );

    cartId =
      newCart.rows[0].id;

  } else {

    cartId =
      cartResult.rows[0].id;

  }

  const itemCheck =
    await pool.query(
      `SELECT *
       FROM cart_items
       WHERE cart_id = $1
       AND product_id = $2`,
      [
        cartId,
        productId
      ]
    );

  if (
    itemCheck.rows.length > 0
  ) {

    const updatedItem =
      await pool.query(
        `UPDATE cart_items
         SET quantity =
             quantity + $1,
             updated_at =
             CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [
          quantity,
          itemCheck.rows[0].id
        ]
      );

    return updatedItem.rows[0];

  }

  const itemResult =
    await pool.query(
      `INSERT INTO cart_items
      (
        cart_id,
        product_id,
        quantity
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING *`,
      [
        cartId,
        productId,
        quantity
      ]
    );

  return itemResult.rows[0];

};

export const getCartService = async (userId) => {
  const cartResult = await pool.query(
    `SELECT id
     FROM carts
     WHERE user_id = $1`,
    [userId]
  );

  if (cartResult.rows.length === 0) {
    return {
      items: [],
      total: 0
    };
  }

  const cartId = cartResult.rows[0].id;

  const result = await pool.query(
    `SELECT
      ci.id AS cart_item_id,
      ci.product_id,
      p.product_name,
      p.price,
      ci.quantity,
      (p.price * ci.quantity) AS subtotal,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.id ASC
        LIMIT 1
      ) AS image_url
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = $1
     ORDER BY ci.id ASC`,
    [cartId]
  );

  const total = result.rows.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );

  return {
    items: result.rows,
    total
  };
};

export const updateCartItemService = async (
  userId,
  cartItemId,
  quantity
) => {

  if (quantity < 1) {
    throw new Error(
      "Quantity minimal 1"
    );
  }

  const result = await pool.query(
    `SELECT
      ci.id,
      p.stock
     FROM cart_items ci
     JOIN carts c
       ON ci.cart_id = c.id
     JOIN products p
       ON ci.product_id = p.id
     WHERE ci.id = $1
     AND c.user_id = $2`,
    [
      cartItemId,
      userId
    ]
  );

  if (
    result.rows.length === 0
  ) {
    throw new Error(
      "Item cart tidak ditemukan"
    );
  }

  const item =
    result.rows[0];

  if (
    quantity > item.stock
  ) {
    throw new Error(
      "Stok tidak mencukupi"
    );
  }

  const updated =
    await pool.query(
      `UPDATE cart_items
       SET quantity = $1,
           updated_at =
           CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [
        quantity,
        cartItemId
      ]
    );

  return updated.rows[0];

};

export const deleteCartItemService = async (
  userId,
  cartItemId
) => {

  const result = await pool.query(
    `DELETE FROM cart_items ci
     USING carts c
     WHERE ci.cart_id = c.id
     AND ci.id = $1
     AND c.user_id = $2
     RETURNING ci.*`,
    [
      cartItemId,
      userId
    ]
  );

  if (
    result.rows.length === 0
  ) {
    throw new Error(
      "Item cart tidak ditemukan"
    );
  }

  return result.rows[0];

};