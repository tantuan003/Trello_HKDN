import Board from "../models/BoardModel.js";
import Workspace from "../models/Workspace.js";
import mongoose from "mongoose";
import User from "../models/UserModel.js";

export const createBoard = async (req, res) => {
  try {
    const { name, workspaceId,visibility} = req.body;
    const userId = req.user?.id; // lấy từ token

    if (!name || !workspaceId) return res.status(400).json({ message: "Thiếu dữ liệu!" });
    if (!userId) return res.status(401).json({ message: "User chưa xác thực" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace không tồn tại" });

    const board = new Board({
      name,
      workspace: workspaceId,
      createdBy: new mongoose.Types.ObjectId(userId),
      background: req.body.background || "gradient-1",
      visibility: visibility || "workspace"
    });

    await board.save();

    workspace.boards = workspace.boards || [];
    workspace.boards.push(board._id);
    await workspace.save();

    const io = req.app.get("socketio");
    if (io) io.to(workspaceId).emit("board:new", board);

    res.status(201).json({ success: true, message: "Tạo board thành công!", board });
  } catch (error) {
    console.error("❌ Lỗi khi tạo board:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const getBoardsByCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id; // lấy trực tiếp từ middleware
    console.log("UserId từ token:", userId);

    const boards = await Board.find({ createdBy: userId })
      .populate("workspace", "name")       // lấy tên workspace
      .populate("createdBy", "username email") // thông tin người tạo
      .sort({ createdAt: -1 });

    if (!boards.length) {
      return res.status(404).json({ message: "Bạn chưa tạo board nào." });
    }

    res.status(200).json(boards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách board." });
  }
};