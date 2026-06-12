import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import { generateOTP } from "../utils/otp.js";
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
    (role_id, full_name, email, password, phone, address, is_verified)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, full_name, email, role_id, is_verified`,
    [
      customerRoleId,
      full_name,
      email,
      hashedPassword,
      phone || null,
      address || null,
      false
    ]
  );

  const user = userResult.rows[0];
  const otpCode = generateOTP();
  const expiredAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `INSERT INTO email_verifications
    (user_id, otp_code, expired_at, is_used)
    VALUES ($1, $2, $3, $4)`,
    [user.id, otpCode, expiredAt, false]
  );

  return {
    user,
    otpCode,
    message: "Registrasi berhasil. Silakan verifikasi OTP."
  };
};

export const verifyOtpService = async (data) => {
  const { email, otp_code } = data;

  if (!email || !otp_code) {
    throw new Error("Email dan OTP wajib diisi");
  }

  const userResult = await pool.query(
    `SELECT id, email, is_verified
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new Error("Email tidak ditemukan");
  }

  const user = userResult.rows[0];

  if (user.is_verified) {
    throw new Error("Akun sudah terverifikasi");
  }

  const otpResult = await pool.query(
    `SELECT id, otp_code, expired_at, is_used
     FROM email_verifications
     WHERE user_id = $1
     AND otp_code = $2
     AND is_used = FALSE
     AND expired_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, otp_code]
  );

  if (otpResult.rows.length === 0) {
    throw new Error("OTP tidak valid atau sudah expired");
  }

  const otpData = otpResult.rows[0];

  await pool.query(
    `UPDATE users
     SET is_verified = TRUE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [user.id]
  );

  await pool.query(
    `UPDATE email_verifications
     SET is_used = TRUE
     WHERE id = $1`,
    [otpData.id]
  );

  return {
    message: "Verifikasi OTP berhasil"
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

  const passwordMatch = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatch) {
    throw new Error("Email atau password salah");
  }

  if (!user.is_verified) {
    throw new Error("Silakan verifikasi email terlebih dahulu");
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
      role_id: user.role_id
    }
  };
};

export const getProfileService = async (
  userId
) => {

  const result = await pool.query(
    `SELECT
      id,
      full_name,
      email,
      role_id,
      is_verified
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error(
      "User tidak ditemukan"
    );
  }

  return result.rows[0];

};