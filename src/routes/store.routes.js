import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { getMyStore } from "../controllers/store.controller.js";

const router = express.Router();

router.get("/my-store", authMiddleware, getMyStore);

export default router;