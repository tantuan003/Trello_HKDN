import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

export const verifyToken = async (req, res, next) => {
  try {
    const COOKIE_NAME = process.env.COOKIE_NAME || "token";
    const token = req.cookies?.[COOKIE_NAME];


    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).populate("workspaces");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    req.user = user;

    next();

  } catch (err) {
    console.error("Token lỗi:", err);

    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
};
