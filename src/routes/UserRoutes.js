import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

import { registerUser } from "../controllers/UserController.js";
import { CreateUser_validation } from "../middlewares/Validation.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { loginUser } from "../controllers/AuthController.js";
import User from "../models/UserModel.js";


const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join("public", "uploads")),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });


router.post("/register", CreateUser_validation, registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyToken, (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
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
    workspaces: user.workspaces,
    avatar: user.avatar
  });
});

router.put("/me", verifyToken, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    if (req.body.username && req.body.username.trim() !== "") {
      user.username = req.body.username.trim();
    }

    if (req.file) {
      if (user.avatar) {
        const oldPath = path.join("public", user.avatar);
        fs.unlink(oldPath, (err) => {
          if (err) console.error("Không thể xoá avatar cũ:", err.message);
        });
      }

      user.avatar = "uploads/" + req.file.filename;
    }

    await user.save();
    res.json({ message: "Cập nhật thành công", user });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect!" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
