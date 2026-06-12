import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage
} from "../controllers/product.controller.js";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(2),
  createProduct
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(2),
  updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(2),
  deleteProduct
);

router.post(
  "/:id/images",
  authMiddleware,
  roleMiddleware(2),
  upload.single("image"),
  uploadProductImage
);
  
export default router;