import { pool } from "../config/db.js";

let ensurePaymentStatusColumnPromise = null;

export const ensureOrderPaymentStatusColumn = async () => {
  if (!ensurePaymentStatusColumnPromise) {
    ensurePaymentStatusColumnPromise = (async () => {
      const columnCheck = await pool.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_name = 'orders'
         AND column_name = 'payment_status'
         LIMIT 1`
      );

      if (columnCheck.rows.length === 0) {
        await pool.query(
          `ALTER TABLE orders
           ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'`
        );

        await pool.query(
          `UPDATE orders
           SET payment_status = CASE
             WHEN order_status = 'PAID' THEN 'PAID'
             WHEN order_status = 'CANCELLED' THEN 'CANCELLED'
             ELSE 'PENDING'
           END
           WHERE payment_status IS NULL`
        );
      }
    })();
  }

  return ensurePaymentStatusColumnPromise;
};
