import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
  createReview,
  getProductReviews,
  getSellerReviews
} from "../controllers/review.controller.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createReview);
router.get("/product/:productId", getProductReviews);
router.get(
  "/seller",
  authMiddleware,
  roleMiddleware(2),
  getSellerReviews
);

export default router;