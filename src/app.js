import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { generateOTP } from "./utils/otp.js";
import { generateToken } from "./utils/jwt.js";
import authRoutes from "./routes/auth.routes.js";
import storeRoutes from "./routes/store.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import reviewRoutes from "./routes/review.routes.js";
dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "LocalMart API is running",
  });
});

app.get("/api/test-otp", (req, res) => {
  const otp = generateOTP();

  res.json({
    otp
  });
});

app.get("/api/test-jwt", (req, res) => {

  const token = generateToken({
    id: 1,
    role: "customer"
  });

  res.json({
    token
  });

});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      success: true,
      message: "Database connected successfully",
      serverTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database Error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products",productRoutes );
app.use("/api/wishlists", wishlistRoutes);
app.use( "/api/cart",cartRoutes );
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/reviews", reviewRoutes);
export default app;