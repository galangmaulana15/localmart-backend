import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = (
  req,
  res,
  next
) => {

  try {

    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan"
      });
    }

    const decoded =
      verifyToken(token);

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Token tidak valid"
    });

  }

};