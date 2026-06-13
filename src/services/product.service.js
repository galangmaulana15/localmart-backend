import { pool } from "../config/db.js";
import { supabase } from "../config/supabase.js";

export const getAllProductsService = async () => {
  const result = await pool.query(
    `SELECT
  p.id,
  p.product_name,
  p.description,
  p.price,
  p.stock,
  p.weight,
  p.is_active,
  c.category_name,
  s.store_name,
  (
    SELECT pi.image_url
    FROM product_images pi
    WHERE pi.product_id = p.id
    ORDER BY pi.is_primary DESC, pi.id ASC
    LIMIT 1
  ) AS image_url
 FROM products p
 JOIN categories c ON p.category_id = c.id
 JOIN stores s ON p.store_id = s.id
 WHERE p.is_active = TRUE
 ORDER BY p.id ASC`
  );

  return result.rows;
};

export const getProductByIdService = async (productId) => {
  const result = await pool.query(
    `SELECT
      p.id,
      p.product_name,
      p.description,
      p.price,
      p.stock,
      p.weight,
      p.is_active,
      c.category_name,
      s.store_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'is_primary', pi.is_primary
          )
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) AS images
     FROM products p
     JOIN categories c ON p.category_id = c.id
     JOIN stores s ON p.store_id = s.id
     LEFT JOIN product_images pi ON pi.product_id = p.id
     WHERE p.id = $1
     GROUP BY
      p.id,
      p.product_name,
      p.description,
      p.price,
      p.stock,
      p.weight,
      p.is_active,
      c.category_name,
      s.store_name`,
    [productId]
  );

  if (result.rows.length === 0) {
    throw new Error("Produk tidak ditemukan");
  }

  return result.rows[0];
};
export const createProductService = async (sellerId, data) => {
  const {
    category_id,
    product_name,
    description,
    price,
    stock,
    weight
  } = data;

  if (!category_id || !product_name || !description || !price || stock === undefined) {
    throw new Error("Kategori, nama produk, deskripsi, harga, dan stok wajib diisi");
  }

  const storeResult = await pool.query(
    `SELECT id FROM stores WHERE seller_id = $1`,
    [sellerId]
  );

  if (storeResult.rows.length === 0) {
    throw new Error("Seller belum memiliki toko");
  }

  const storeId = storeResult.rows[0].id;

  const result = await pool.query(
    `INSERT INTO products
    (store_id, category_id, product_name, description, price, stock, weight, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    RETURNING *`,
    [
      storeId,
      category_id,
      product_name,
      description,
      price,
      stock,
      weight || 0
    ]
  );

  return result.rows[0];
};

export const updateProductService = async (sellerId, productId, data) => {
  const {
    category_id,
    product_name,
    description,
    price,
    stock,
    weight
  } = data;

  const productCheck = await pool.query(
    `SELECT p.id
     FROM products p
     JOIN stores s ON p.store_id = s.id
     WHERE p.id = $1 AND s.seller_id = $2`,
    [productId, sellerId]
  );

  if (productCheck.rows.length === 0) {
    throw new Error("Produk tidak ditemukan atau bukan milik seller");
  }

  const result = await pool.query(
    `UPDATE products
     SET category_id = $1,
         product_name = $2,
         description = $3,
         price = $4,
         stock = $5,
         weight = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [
      category_id,
      product_name,
      description,
      price,
      stock,
      weight || 0,
      productId
    ]
  );

  return result.rows[0];
};

export const deleteProductService = async (sellerId, productId) => {
  const productCheck = await pool.query(
    `SELECT p.id
     FROM products p
     JOIN stores s ON p.store_id = s.id
     WHERE p.id = $1 AND s.seller_id = $2`,
    [productId, sellerId]
  );

  if (productCheck.rows.length === 0) {
    throw new Error("Produk tidak ditemukan atau bukan milik seller");
  }

  const result = await pool.query(
    `UPDATE products
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [productId]
  );

  return result.rows[0];
};

export const uploadProductImageService = async (
  sellerId,
  productId,
  file
) => {

  const productCheck = await pool.query(
    `SELECT p.id
     FROM products p
     JOIN stores s
     ON p.store_id = s.id
     WHERE p.id = $1
     AND s.seller_id = $2`,
    [productId, sellerId]
  );

  if (productCheck.rows.length === 0) {
    throw new Error(
      "Produk tidak ditemukan atau bukan milik seller"
    );
  }

  const safeFileName = file.originalname
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.-]/g, "")
    .toLowerCase();

  const fileName =
    `product-${productId}-${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(
      fileName,
      file.buffer,
      {
        contentType: file.mimetype,
        upsert: false
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(fileName);

  const imageUrl = data.publicUrl;

  const imageResult = await pool.query(
    `INSERT INTO product_images
    (
      product_id,
      image_url,
      is_primary
    )
    VALUES
    (
      $1,
      $2,
      $3
    )
    RETURNING *`,
    [
      productId,
      imageUrl,
      false
    ]
  );

  return imageResult.rows[0];
};