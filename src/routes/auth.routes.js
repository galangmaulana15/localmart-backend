import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  registerCustomer,
  login,
  getProfile,
  logout
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", login);
router.get("/profile", authMiddleware, getProfile);
router.post("/logout", authMiddleware, logout);

export default router;