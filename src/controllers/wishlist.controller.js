import {
  addWishlistService,
  getWishlistService,
  removeWishlistService
} from "../services/wishlist.service.js";

export const addWishlist = async (req, res) => {
  try {
    const result = await addWishlistService(
      req.user.id,
      req.body.product_id
    );

    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan ke wishlist",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const result = await getWishlistService(req.user.id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const removeWishlist = async (req, res) => {
  try {
    const result = await removeWishlistService(
      req.user.id,
      req.params.productId
    );

    res.status(200).json({
      success: true,
      message: "Produk berhasil dihapus dari wishlist",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};