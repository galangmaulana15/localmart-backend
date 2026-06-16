import express from "express";
import { handleXenditWebhook } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/webhook", handleXenditWebhook);

export default router;
