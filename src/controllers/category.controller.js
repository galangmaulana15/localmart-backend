import { getAllCategoriesService } from "../services/category.service.js";

export const getAllCategories = async (req, res) => {
  try {
    const categories = await getAllCategoriesService();

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};