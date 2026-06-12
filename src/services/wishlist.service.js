import { pool } from "../config/db.js";

export const addWishlistService = async (userId, productId) => {
  const product = await pool.query(
    "SELECT id FROM products WHERE id = $1 AND is_active = TRUE",
    [productId]
  );

  if (product.rows.length === 0) {
    throw new Error("Produk tidak ditemukan");
  }

  const result = await pool.query(
    `INSERT INTO wishlists (user_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING
     RETURNING *`,
    [userId, productId]
  );

  if (result.rows.length === 0) {
    throw new Error("Produk sudah ada di wishlist");
  }

  return result.rows[0];
};

export const getWishlistService = async (userId) => {
  const result = await pool.query(
    `SELECT
      w.id,
      w.product_id,
      p.product_name,
      p.price,
      p.stock,
      c.category_name,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.id ASC
        LIMIT 1
      ) AS image_url,
      w.created_at
     FROM wishlists w
     JOIN products p ON w.product_id = p.id
     JOIN categories c ON p.category_id = c.id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );

  return result.rows;
};

export const removeWishlistService = async (userId, productId) => {
  const result = await pool.query(
    `DELETE FROM wishlists
     WHERE user_id = $1 AND product_id = $2
     RETURNING *`,
    [userId, productId]
  );

  if (result.rows.length === 0) {
    throw new Error("Produk tidak ada di wishlist");
  }

  return result.rows[0];
};