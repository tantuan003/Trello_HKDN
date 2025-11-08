import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.token; // hoặc req.headers.authorization
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // 🔑 payload token gán vào req.user
    next();
  } catch (err) {
    console.error("Token lỗi:", err);
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};
