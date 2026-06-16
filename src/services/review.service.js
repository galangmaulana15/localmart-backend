import { pool } from "../config/db.js";

export const createReviewService = async (
  userId,
  productId,
  rating,
  comment
) => {
  if (!productId || !rating) {
    throw new Error("Produk dan rating wajib diisi");
  }

  if (rating < 1 || rating > 5) {
    throw new Error("Rating harus antara 1 sampai 5");
  }

  const purchased = await pool.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = $1
     AND oi.product_id = $2
     AND o.order_status IN ('PAID', 'DELIVERED', 'COMPLETED')
     LIMIT 1`,
    [userId, productId]
  );

  if (purchased.rows.length === 0) {
    throw new Error("Produk hanya bisa direview setelah dibeli");
  }

  const result = await pool.query(
    `INSERT INTO reviews
     (user_id, product_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      userId,
      productId,
      rating,
      comment || null
    ]
  );

  return result.rows[0];
};

export const getSellerReviewsService = async (sellerId) => {
  const result = await pool.query(
    `SELECT
      r.id,
      r.product_id,
      p.product_name,
      r.rating,
      r.comment,
      r.created_at,
      u.full_name AS customer_name
     FROM reviews r
     JOIN products p ON r.product_id = p.id
     JOIN stores s ON p.store_id = s.id
     JOIN users u ON r.user_id = u.id
     WHERE s.seller_id = $1
     ORDER BY r.created_at DESC`,
    [sellerId]
  );

  return result.rows;
};

export const getProductReviewsService = async (productId) => {
  const result = await pool.query(
    `SELECT
      r.id,
      r.product_id,
      r.rating,
      r.comment,
      r.created_at,
      u.full_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = $1
     ORDER BY r.created_at DESC`,
    [productId]
  );

  return result.rows;
};