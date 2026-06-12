import { pool } from "../config/db.js";

export const getMyStoreService = async (userId) => {
  const result = await pool.query(
    `SELECT *
     FROM stores
     WHERE seller_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Toko tidak ditemukan");
  }

  return result.rows[0];
};