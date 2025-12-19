import Board from "../models/BoardModel.js";
import Workspace from "../models/Workspace.js";
import mongoose from "mongoose";
import List from "../models/ListModel.js";
import Card from "../models/CardModel.js";
import User from "../models/UserModel.js";
import multer from "multer";
import path from "path";
import { io } from "../server.js";

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

    // Populate lists + cards + members
    const board = await Board.findById(boardId)
      .populate({
        path: "lists",
        populate: { path: "cards" },  // nested populate cards trong list
      })
      .populate("members", "username email"); // populate member info

    // Cập nhật lastViewedAt
    await Board.findByIdAndUpdate(boardId, { lastViewedAt: new Date() });

    if (!board) return res.status(404).json({ message: "Board không tồn tại" });

    res.status(200).json({ success: true, board });
  } catch (error) {
    console.error("Lỗi getBoardById:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const getBoardsByWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Lấy toàn bộ boards thuộc workspace
    const boards = await Board.find({ workspace: workspaceId })
      .populate({
        path: "lists",
        populate: { path: "cards" },
      })
      .populate("members", "username email");

    res.status(200).json({
      success: true,
      data: boards
    });

  } catch (error) {
    console.error("Lỗi getBoardsByWorkspace:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
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

    const io = req.app.get("socketio");
    io.to(boardId).emit("newList", newList);
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
    console.log("userid là ", userId);

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
      createdBy: userId, // 🔑 bắt buộc phải gán
      position
    });

    await newCard.save();
    await List.findByIdAndUpdate(list._id, { $push: { cards: newCard._id } });
    const io = req.app.get("socketio");
    io.to(list.board.toString()).emit("newCard", newCard);

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
export const getCardById = async (req, res) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id)
      .populate("list", "name")               // tên list
      .populate("assignedTo", "username email") // user được giao
      .populate("createdBy", "username email")  // người tạo
      .populate("comments.user", "username email"); // bình luận

    if (!card)
      return res.status(404).json({ success: false, message: "Card không tồn tại" });

    res.status(200).json({ success: true, data: card });
  } catch (err) {
    console.error("getCardById error:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
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


// tải background 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join("public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/**
 * Controller xử lý upload background
 */
export const uploadBackground = [
  upload.single("background"),
  async (req, res) => {
    try {
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("❌ Lỗi upload background:", error);
      res.status(500).json({ message: "Upload thất bại", error });
    }
  },
];

// GET /api/boards/recent
export const getBoardsrecent = async (req, res) => {
  try {
    // 🔐 đảm bảo có user từ token
    if (!req.user || !req.user.id) {
      console.log("Không tìm thấy user trong req.user:", req.user);
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin user từ token."
      });
    }

    const userId = req.user.id;
    console.log("UserId từ token:", userId);

    const boards = await Board.find({
      $or: [
        { createdBy: userId },
        { members: userId }
      ]
    })
      .populate("workspace", "name")
      .populate("createdBy", "username email")
      .sort({
        lastViewedAt: -1, // ⭐ sắp xếp theo xem gần nhất
        createdAt: -1
      });

    // KHÔNG trả 404 nữa, cứ trả mảng rỗng cho dễ xử lý phía client
    return res.status(200).json({
      success: true,
      data: boards
    });
  } catch (error) {
    console.error("getBoardsByCurrentUser error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      // ⚠ chỉ để tạm debug, sau này xoá đi
      error: error.message
    });
  }
};

// update card
export const updateCard = async (req, res) => {
  try {
    const { id } = req.params;

    // Các trường được phép update
    const allowedFields = ["name", "description", "dueDate", "labels", "assignedTo", "attachments"];
    const updateData = {};

    // Lấy những trường tồn tại trong req.body
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === "dueDate") {
          const date = new Date(req.body[field]);
          if (!isNaN(date.valueOf())) {
            updateData[field] = date;
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Update card
    const card = await Card.findByIdAndUpdate(id, updateData, { new: true })
      .populate("assignedTo", "username _id")
      .populate("createdBy", "username email")
      .populate("list", "name")
      .populate("comments.user", "username email");

    if (!card)
      return res.status(404).json({ success: false, message: "Card không tồn tại" });

    // ⭐ Emit sự kiện realtime tới room listId
    if (card.list && card.list.board && card.list.board._id) {
      io.to(card.list.board._id.toString()).emit("cardUpdated", card);
    }

    // ⭐ Emit realtime tới room cardId (card detail) nếu muốn
    io.to(card._id.toString()).emit("cardUpdated", card);


    res.status(200).json({ success: true, data: card });
  } catch (err) {
    console.error("updateCard error:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

//card-complete

export const updateCardComplete = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { complete } = req.body; // true / false

    if (typeof complete !== "boolean") {
      return res.status(400).json({ message: "complete must be boolean" });
    }

    const card = await Card.findByIdAndUpdate(
      cardId,
      { complete },
      { new: true }
    );

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Emit realtime nếu bạn dùng socket.io
    req.io?.to(cardId).emit("card:completeUpdated", {
      cardId,
      complete
    });

    return res.json({
      message: "Card updated successfully",
      card
    });

  } catch (error) {
    console.error("Error updating card complete:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const deleteBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, message: "Board không tồn tại" });
    }

    // ✅ Chỉ cho phép người tạo board xoá
    if (board.createdBy?.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xoá board này" });
    }

    // ✅ Xoá toàn bộ cards thuộc các list của board
    const lists = await List.find({ board: boardId }).select("_id");
    const listIds = lists.map((l) => l._id);

    if (listIds.length) {
      await Card.deleteMany({ list: { $in: listIds } });
      await List.deleteMany({ _id: { $in: listIds } });
    }

    // ✅ Gỡ board khỏi workspace.boards
    if (board.workspace) {
      await Workspace.findByIdAndUpdate(board.workspace, {
        $pull: { boards: board._id },
      });
    }

    // ✅ Xoá board
    await Board.deleteOne({ _id: boardId });

    const io = req.app.get("socketio");
    if (io) {
      io.emit("board:deleted", { boardId });  // ✅ đổi từ io.to(workspace) -> io.emit
    }

    return res.status(200).json({ success: true, message: "Xoá board thành công" });
  } catch (error) {
    console.error("❌ deleteBoard error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
