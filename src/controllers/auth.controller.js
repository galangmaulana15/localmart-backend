import {
  registerCustomerService,
  verifyOtpService,
  loginService,
  getProfileService
} from "../services/auth.service.js";
export const registerCustomer = async (req, res) => {
  try {
    const result = await registerCustomerService(req.body);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        otp_debug: result.otpCode
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const result = await verifyOtpService(req.body);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message
    });

  }
};

export const login = async (req, res) => {
  try {
    const result = await loginService(req.body);

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user: result.user
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getProfile = async (
  req,
  res
) => {

  try {

    const profile =
      await getProfileService(
        req.user.id
      );

    res.status(200).json({
      success: true,
      data: profile
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message
    });

  }

};

export const logout = async (
  req,
  res
) => {

  res.clearCookie("token");

  res.status(200).json({
    success: true,
    message: "Logout berhasil"
  });

};