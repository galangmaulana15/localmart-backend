import { pool } from "../config/db.js";

export const getOrCreateWalletService = async (userId) => {
  let walletResult = await pool.query(
    `SELECT *
     FROM wallets
     WHERE user_id = $1`,
    [userId]
  );

  if (walletResult.rows.length === 0) {
    walletResult = await pool.query(
      `INSERT INTO wallets (user_id, balance)
       VALUES ($1, 0)
       RETURNING *`,
      [userId]
    );
  }

  return walletResult.rows[0];
};

export const topUpWalletService = async (userId, amount, paymentMethod) => {
  const topUpAmount = Number(amount);

  if (!topUpAmount || topUpAmount <= 0) {
    throw new Error("Nominal top up harus lebih dari 0");
  }

  if (!paymentMethod) {
    throw new Error("Metode pembayaran wajib diisi");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let walletResult = await client.query(
      `SELECT *
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (walletResult.rows.length === 0) {
      walletResult = await client.query(
        `INSERT INTO wallets (user_id, balance)
         VALUES ($1, 0)
         RETURNING *`,
        [userId]
      );
    }

    const wallet = walletResult.rows[0];
    const newBalance = Number(wallet.balance) + topUpAmount;

    const updatedWallet = await client.query(
      `UPDATE wallets
       SET balance = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newBalance, wallet.id]
    );

    const transactionResult = await client.query(
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
        'TOPUP',
        $2,
        $3,
        'SUCCESS',
        $4
       )
       RETURNING *`,
      [
        wallet.id,
        paymentMethod,
        topUpAmount,
        `Top up saldo melalui ${paymentMethod}`
      ]
    );

    await client.query("COMMIT");

    return {
      wallet: updatedWallet.rows[0],
      transaction: transactionResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getWalletTransactionsService = async (userId) => {
  const wallet = await getOrCreateWalletService(userId);

  const result = await pool.query(
    `SELECT *
     FROM wallet_transactions
     WHERE wallet_id = $1
     ORDER BY created_at DESC`,
    [wallet.id]
  );

  return result.rows;
};