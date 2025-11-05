// src/controller/AuthController.js
import User from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
const COOKIE_NAME = process.env.COOKIE_NAME || "token";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // kiểm tra email và password truyền lên
    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // So sánh mật khẩu
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Tạo payload (chỉ để thông tin cần thiết)
    const payload = { id: user._id, email: user.email };

    // Tạo token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Gửi cookie httpOnly (an toàn hơn so với localStorage)
    // Trong development bạn có thể set secure: false
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // chỉ gửi cookie qua HTTPS khi production
      sameSite: "lax",
      maxAge: (() => {
        // maxAge bằng mili giây; mapping đơn giản với JWT_EXPIRES_IN nếu là "1d"
        // ta dùng 24h khi JWT_EXPIRES_IN chứa "d"
        if (JWT_EXPIRES_IN.endsWith("d")) {
          const days = parseInt(JWT_EXPIRES_IN.replace("d","")) || 1;
          return days * 24 * 60 * 60 * 1000;
        }
        // mặc định 1 ngày
        return 24 * 60 * 60 * 1000;
      })()
    });

    // Trả thông tin tối thiểu cho client
    return res.status(200).json({
      message: "Đăng nhập thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
