import {
  addToCartService,
  getCartService,
  updateCartItemService,
  deleteCartItemService
} from "../services/cart.service.js";

export const addToCart = async (req, res) => {
  try {
    const result = await addToCartService(
      req.user.id,
      req.body.product_id,
      req.body.quantity
    );

    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan ke keranjang",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getCart = async (req, res) => {
  try {
    const result = await getCartService(req.user.id);

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

export const updateCartItem =
  async (
    req,
    res
  ) => {

  try {

    const result =
      await updateCartItemService(
        req.user.id,
        req.params.cartItemId,
        req.body.quantity
      );

    res.status(200).json({
      success: true,
      message:
        "Quantity berhasil diubah",
      data: result
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message:
        error.message
    });

  }

};

export const deleteCartItem =
  async (
    req,
    res
  ) => {

  try {

    const result =
      await deleteCartItemService(
        req.user.id,
        req.params.cartItemId
      );

    res.status(200).json({
      success: true,
      message:
        "Item berhasil dihapus dari cart",
      data: result
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message:
        error.message
    });

  }

};