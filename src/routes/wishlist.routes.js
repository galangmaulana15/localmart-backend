import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
  addWishlist,
  getWishlist,
  removeWishlist
} from "../controllers/wishlist.controller.js";

const router = express.Router();

router.post("/", authMiddleware, addWishlist);
router.get("/", authMiddleware, getWishlist);
router.delete("/:productId", authMiddleware, removeWishlist);

export default router;