import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
  getWallet,
  topUpWallet,
  getWalletTransactions
} from "../controllers/wallet.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getWallet);
router.post("/topup", authMiddleware, topUpWallet);
router.get("/transactions", authMiddleware, getWalletTransactions);

export default router;