import {
  getOrCreateWalletService,
  topUpWalletService,
  getWalletTransactionsService
} from "../services/wallet.service.js";

export const getWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWalletService(req.user.id);

    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const topUpWallet = async (req, res) => {
  try {
    const { amount, payment_method } = req.body;

    const wallet = await topUpWalletService(
      req.user.id,
      amount,
      payment_method
    );

    res.status(200).json({
      success: true,
      message: "Top up saldo berhasil",
      data: wallet
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const transactions = await getWalletTransactionsService(req.user.id);

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};