import {
  checkoutService,
  getMyOrdersService,
  getOrderByIdService,
  payOrderWithWalletService,
  getAllOrdersAdminService,
  updateOrderStatusService,
  getSellerOrdersService
} from "../services/order.service.js";
export const checkout = async (req, res) => {
  try {
    const { payment_method, shipping_address } = req.body;

    if (!payment_method || !shipping_address) {
      return res.status(400).json({
        success: false,
        message: "Metode pembayaran dan alamat pengiriman wajib diisi"
      });
    }

    const order = await checkoutService(
      req.user.id,
      payment_method,
      shipping_address
    );

    res.status(201).json({
      success: true,
      message: "Checkout berhasil, order berhasil dibuat",
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await getMyOrdersService(req.user.id);

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const result = await getOrderByIdService(
      req.user.id,
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const payOrderWithWallet = async (req, res) => {
  try {
    const result = await payOrderWithWalletService(
      req.user.id,
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Pembayaran order dengan wallet berhasil",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await getAllOrdersAdminService();

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await updateOrderStatusService(
      req.params.id,
      req.body.status
    );

    res.status(200).json({
      success: true,
      message: "Status order berhasil diperbarui",
      data: order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getSellerOrders = async (req, res) => {
  try {
    const orders = await getSellerOrdersService(req.user.id);

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};