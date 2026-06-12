import { pool } from "../config/db.js";

export const getAllCategoriesService = async () => {
  const result = await pool.query(
    `SELECT id, category_name, description, created_at
     FROM categories
     ORDER BY id ASC`
  );

  return result.rows;
};