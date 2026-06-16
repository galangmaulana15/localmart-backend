import {
  createReviewService,
  getProductReviewsService,
  getSellerReviewsService
} from "../services/review.service.js";

export const createReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;

    const review = await createReviewService(
      req.user.id,
      product_id,
      rating,
      comment
    );

    res.status(201).json({
      success: true,
      message: "Review berhasil ditambahkan",
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getSellerReviews = async (req, res) => {
  try {
    const reviews = await getSellerReviewsService(req.user.id);

    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const reviews = await getProductReviewsService(req.params.productId);

    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};