import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import {
  checkout,
  getMyOrders,
  getOrderById,
  payOrderWithWallet,
  updateOrderStatus,
  getSellerOrders
} from "../controllers/order.controller.js";

const router = express.Router();

router.post("/checkout", authMiddleware, checkout);
router.get("/", authMiddleware, getMyOrders);
router.get("/:id", authMiddleware, getOrderById);
router.post("/:id/pay-wallet", authMiddleware, payOrderWithWallet);

router.get(
  "/seller/my-orders",
  authMiddleware,
  roleMiddleware(2),
  getSellerOrders
);

router.put(
  "/:id/status",
  authMiddleware,
  updateOrderStatus
);

export default router;