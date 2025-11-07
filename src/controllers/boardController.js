import Board from "../models/BoardModel.js";
import Workspace from "../models/Workspace.js";

export const createBoard = async (req, res) => {
  try {
    const { name, workspaceId,userId } = req.body;
    //const userId = req.user._id; // từ middleware xác thực JWT

    // Kiểm tra workspace tồn tại
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace không tồn tại" });
    }

    // Tạo board
    const board = new Board({
      name,
      workspace: workspaceId,
      createdBy: userId,
    });

    await board.save();

    // Thêm board vào workspace
    workspace.boards = workspace.boards || [];
    workspace.boards.push(board._id);
    await workspace.save();
    const io = req.app.get("socketio");
    io.to(workspaceId).emit("board:new", newBoard);


    res.status(201).json({
      message: "Tạo board thành công",
      board,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
