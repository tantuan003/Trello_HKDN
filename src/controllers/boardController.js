import Board from "../models/BoardModel.js";
import Workspace from "../models/Workspace.js";
import mongoose from "mongoose";
import User from "../models/UserModel.js";

export const createBoard = async (req, res) => {
  try {
    const { name, workspaceId, userId } = req.body;

    // 1️⃣ Kiểm tra dữ liệu
    if (!name || !workspaceId || !userId) {
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết!" });
    }

    // 2️⃣ Kiểm tra workspace có tồn tại không
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace không tồn tại" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }


    // 3️⃣ Tạo board mới
    const board = new Board({
      name,
      workspace: workspaceId,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await board.save();

    // 4️⃣ Cập nhật workspace chứa board
    workspace.boards = workspace.boards || [];
    workspace.boards.push(board._id);
    await workspace.save();

    // 5️⃣ Emit socket (thông báo cho các client khác trong workspace)
    const io = req.app.get("socketio");
    if (io) {
      io.to(workspaceId).emit("board:new", board);
    }

    // 6️⃣ Trả về phản hồi
    res.status(201).json({
      success: true,
      message: "Tạo board thành công!",
      board,
    });

  } catch (error) {
    console.error("❌ Lỗi khi tạo board:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
export const getBoardsByUser = async (req, res) => {
  try {
    const userId = req.params.userId.trim();
    console.log("UserId nhận được:", userId);


    // Tìm tất cả board mà user là người tạo
    const boards = await Board.find({ createdBy: userId })
      .populate("workspace", "name") // lấy tên workspace
      .populate("createdBy", "username email") // lấy thông tin người tạo
      .sort({ createdAt: -1 }); // mới nhất trước

    if (!boards.length) {
      return res.status(404).json({ message: "Người dùng này chưa tạo board nào." });
    }

    res.status(200).json(boards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách board." });
  }
};