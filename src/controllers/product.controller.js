import {
  getAllProductsService,
  getProductByIdService,
  createProductService,
  updateProductService,
  deleteProductService,
  uploadProductImageService,
  
} from "../services/product.service.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await getAllProductsService();

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await getProductByIdService(req.params.id);

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await createProductService(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan",
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await updateProductService(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await deleteProductService(
      req.user.id,
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Produk berhasil dihapus",
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const uploadProductImage =
  async (
    req,
    res
  ) => {

  try {

    if (!req.file) {

      return res
        .status(400)
        .json({
          success: false,
          message:
            "File gambar wajib diupload"
        });

    }

    const image =
      await uploadProductImageService(
        req.user.id,
        req.params.id,
        req.file
      );

    res.status(201).json({
      success: true,
      message:
        "Gambar berhasil diupload",
      data: image
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message:
        error.message
    });

  }

};

