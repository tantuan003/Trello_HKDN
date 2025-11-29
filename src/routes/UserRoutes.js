import express from "express";
import { registerUser } from "../controllers/UserController.js";
import { CreateUser_validation } from "../middlewares/Validation.js";
import{verifyToken}from"../middlewares/verifyToken.js";
import { loginUser } from "../controllers/AuthController.js";

const router = express.Router();

router.post("/register", CreateUser_validation, registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyToken, (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Đăng xuất thành công!",
  });
});
router.get("/checkToken", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get("/me", verifyToken, (req, res) => {
  const user = req.user;

  res.json({
    id: user._id,
    username: user.username,
    email: user.email,
    workspaces: user.workspaces    // trả về danh sách workspaces của user
  });
});

export default router;
