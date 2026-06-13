import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

export const registerCustomerService = async (data) => {
  const { full_name, email, password, phone, address } = data;

  if (!full_name || !email || !password) {
    throw new Error("Nama, email, dan password wajib diisi");
  }

  if (password.length < 6) {
    throw new Error("Password minimal 6 karakter");
  }

  const checkEmail = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (checkEmail.rows.length > 0) {
    throw new Error("Email sudah terdaftar");
  }

  const roleResult = await pool.query(
    "SELECT id FROM roles WHERE role_name = $1",
    ["customer"]
  );

  if (roleResult.rows.length === 0) {
    throw new Error("Role customer tidak ditemukan");
  }

  const customerRoleId = roleResult.rows[0].id;
  const hashedPassword = await bcrypt.hash(password, 10);

  const userResult = await pool.query(
    `INSERT INTO users 
    (role_id, full_name, email, password, phone, address)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, full_name, email, role_id, phone, address`,
    [
      customerRoleId,
      full_name,
      email,
      hashedPassword,
      phone || null,
      address || null
    ]
  );

  return {
    user: userResult.rows[0],
    message: "Registrasi berhasil. Silakan login."
  };
};

export const loginService = async (data) => {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error("Email dan password wajib diisi");
  }

  const userResult = await pool.query(
    `SELECT *
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new Error("Email atau password salah");
  }

  const user = userResult.rows[0];

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new Error("Email atau password salah");
  }

  const token = generateToken({
    id: user.id,
    role_id: user.role_id
  });

  return {
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id,
      phone: user.phone,
      address: user.address
    }
  };
};

export const getProfileService = async (userId) => {
  const result = await pool.query(
    `SELECT
      id,
      full_name,
      email,
      role_id,
      phone,
      address
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("User tidak ditemukan");
  }

  return result.rows[0];
};