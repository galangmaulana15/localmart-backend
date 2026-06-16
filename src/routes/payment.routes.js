import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createXenditCheckout,
  handleXenditWebhook,
  payOrderWithXendit,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/xendit/checkout", authMiddleware, createXenditCheckout);
router.post("/xendit/orders/:id/pay", authMiddleware, payOrderWithXendit);
router.post("/xendit/webhook", handleXenditWebhook);

export default router;
