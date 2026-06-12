import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
  createReview,
  getProductReviews
} from "../controllers/review.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createReview);
router.get("/product/:productId", getProductReviews);

export default router;