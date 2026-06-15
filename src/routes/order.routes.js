import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  checkout,
  getMyOrders,
  getOrderById,
  payOrderWithWallet,
  getAllOrdersAdmin,
  updateOrderStatus,
  getSellerOrders
} from "../controllers/order.controller.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/checkout", authMiddleware, checkout);
router.get("/", authMiddleware, getMyOrders);
router.get("/:id", authMiddleware, getOrderById);
router.post("/:id/pay-wallet", authMiddleware, payOrderWithWallet);
router.get(
  "/admin/all",
  authMiddleware,
  roleMiddleware(1),
  getAllOrdersAdmin
);

router.put(
  "/admin/:id/status",
  authMiddleware,
  roleMiddleware(1),
  updateOrderStatus
);

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