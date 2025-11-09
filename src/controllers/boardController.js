import Board from "../models/BoardModel.js";
import Workspace from "../models/Workspace.js";
import mongoose from "mongoose";
import List from "../models/ListModel.js";
import Card from "../models/CardModel.js";
import User from "../models/UserModel.js";

export const createBoard = async (req, res) => {
  try {
    const { name, workspaceId, visibility } = req.body;
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

    const boards = await Board.find({
      $or: [
        { createdBy: userId },
        { members: userId }  // members là mảng lưu ObjectId của các user
      ]
    })
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

export const getBoardById = async (req, res) => {
  try {
    const { boardId } = req.params;

    // Populate lists và cards
    const board = await Board.findById(boardId)
      .populate({
        path: "lists",
        populate: { path: "cards" }  // nested populate cards trong list
      });

    if (!board) return res.status(404).json({ message: "Board không tồn tại" });

    res.status(200).json({ success: true, board });
  } catch (error) {
    console.error("Lỗi getBoardById:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const createList = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name } = req.body;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const newList = await List.create({ name, board: boardId, cards: [] });

    board.lists.push(newList._id);
    await board.save();

    res.status(201).json(newList);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// tạo card
export const createCard = async (req, res) => {
  try {
    const { listId } = req.params;
    const { name, description, assignedTo, labels, dueDate } = req.body;
    const userId = req.user?.id;
    console.log("userid là ",userId);

    const list = await List.findById(listId);
    if (!list) return res.status(404).json({ message: "List không tồn tại." });

    const lastCard = await Card.findOne({ list: listId }).sort({ position: -1 });
    const position = lastCard ? lastCard.position + 1 : 0;

    const newCard = new Card({
      name,
      description,
      list: list._id,       // theo schema Card
      assignedTo: assignedTo || [],
      labels: labels || [],
      dueDate: dueDate || null,
      createdBy:userId, // 🔑 bắt buộc phải gán
      position
    });

    await newCard.save();
    await List.findByIdAndUpdate(list._id, { $push: { cards: newCard._id } });

    res.status(201).json({ message: "Tạo card thành công!", card: newCard });
  } catch (error) {
    console.error("Lỗi khi tạo card:", error);
    res.status(500).json({ message: "Lỗi server khi tạo card." });
  }
};


// lấy card theo list

export const getCardsByList = async (req, res) => {
  try {
    const { listId } = req.params;

    const cards = await Card.find({ listId })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ position: 1 });

    res.status(200).json(cards);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách card:", error);
    res.status(500).json({ message: "Lỗi server khi lấy card." });
  }
};


// mời user
export const inviteUser = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!boardId) return res.status(400).json({ message: "Board ID không hợp lệ" });

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board không tồn tại" });

    // ✅ Khai báo email từ body trước khi dùng
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email không hợp lệ" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Kiểm tra user đã là member chưa
    if (board.members.includes(user._id) || board.createdBy.equals(user._id)) {
      return res.status(400).json({ message: "User đã ở trong board" });
    }

    // Thêm user vào board
    board.members.push(user._id);
    await board.save();

    res.status(200).json({ message: "Mời user thành công!", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
