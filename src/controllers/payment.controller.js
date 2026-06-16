import {
  createXenditCheckoutService,
  handleXenditWebhookService,
  payOrderWithXenditService,
} from "../services/payment.service.js";
import { isXenditWebhookAuthorized } from "../services/xendit.service.js";

export const createXenditCheckout = async (req, res) => {
  try {
    const result = await createXenditCheckoutService(req.user.id, req.body || {});

    res.status(201).json({
      success: true,
      message: "Checkout Xendit berhasil dibuat",
      data: result,
    });
  } catch (error) {
    const statusCode = String(error.message || "").includes("XENDIT_SECRET_KEY") ? 503 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const payOrderWithXendit = async (req, res) => {
  try {
    const result = await payOrderWithXenditService(req.user.id, req.params.id);

    res.status(201).json({
      success: true,
      message: "Invoice pembayaran berhasil dibuat",
      data: result,
    });
  } catch (error) {
    const statusCode = String(error.message || "").includes("XENDIT_SECRET_KEY") ? 503 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleXenditWebhook = async (req, res) => {
  try {
    if (!isXenditWebhookAuthorized(req)) {
      return res.status(401).json({
        success: false,
        message: "Webhook tidak terotorisasi",
      });
    }

    const result = await handleXenditWebhookService(req.body || {});

    res.status(200).json({
      success: true,
      message: "Webhook diproses",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
