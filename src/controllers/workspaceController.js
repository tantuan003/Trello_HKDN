import Workspace from "../models/Workspace.js";
import mongoose from "mongoose";

// Lấy tất cả workspace của user hiện tại
export const getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user?.id; // chỉ lấy từ req.user
    if (!userId) return res.status(401).json({ message: "User chưa xác thực" });

    const workspaces = await Workspace.find({
      owner: new mongoose.Types.ObjectId(userId)
    });
    res.status(200).json(workspaces);
  } catch (err) {
    console.error("Lỗi lấy workspace:", err);
    res.status(500).json({ message: "Lỗi khi lấy workspace", error: err.message });
  }
};

