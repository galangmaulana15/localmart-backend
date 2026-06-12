import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem
} from "../controllers/cart.controller.js";

const router = express.Router();

router.post("/add",authMiddleware,addToCart);
router.get("/",authMiddleware,getCart);
router.put("/:cartItemId",authMiddleware,updateCartItem);
router.delete("/:cartItemId",authMiddleware,deleteCartItem);

export default router;