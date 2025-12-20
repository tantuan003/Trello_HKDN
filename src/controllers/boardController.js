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
    const { name, workspaceId, visibility, background } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Chưa xác thực" });
    if (!name?.trim()) return res.status(400).json({ message: "Tên board không hợp lệ" });
    if (!mongoose.Types.ObjectId.isValid(workspaceId))
      return res.status(400).json({ message: "workspaceId không hợp lệ" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ message: "Workspace không tồn tại" });

    // (tuỳ chọn) check user là member workspace
    // if (!workspace.members.includes(userId)) return res.status(403)...

    const board = await Board.create({
      name: name.trim(),
      workspace: workspaceId,
      createdBy: userId,
      background: background || "gradient-1",
      visibility: visibility || "workspace",
      members: [
        {
          user: userId,
          role: "owner"
        }
      ]
    });

    workspace.boards.push(board._id);
    await workspace.save();

    const io = req.app.get("socketio");
    io?.to(`workspace:${workspaceId}`).emit("board:new", board);

    res.status(201).json({
      success: true,
      message: "Tạo board thành công",
      board
    });
  } catch (error) {
    console.error("❌ createBoard error:", error);
    res.status(500).json({ message: "Lỗi server" });
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

    const board = await Board.findById(boardId)
      .populate({
        path: "lists",
        populate: {
          path: "cards"
        }
      })
      .populate({
        path: "members.user",
        select: "username email avatar"
      });

    if (!board) {
      return res.status(404).json({ message: "Board không tồn tại" });
    }

    // update lastViewedAt (không cần await cũng được)
    Board.findByIdAndUpdate(boardId, {
      lastViewedAt: new Date()
    }).catch(() => {});

    res.status(200).json({
      success: true,
      board
    });
  } catch (error) {
    console.error("❌ getBoardById error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
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
    const { email } = req.body;
    const inviterId = req.user?.id;

    if (!boardId || !email) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board không tồn tại" });
    }

    // 1️⃣ Check quyền inviter trong board
    const inviter = board.members.find(
      m => m.user.toString() === inviterId
    );

    if (!inviter || !["owner", "admin"].includes(inviter.role)) {
      return res.status(403).json({ message: "Không có quyền mời member" });
    }

    // 2️⃣ Lấy workspace
    const workspace = await Workspace.findById(board.workspace);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace không tồn tại" });
    }

    // 3️⃣ Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    // 4️⃣ Check user đã ở workspace chưa
    const isWorkspaceMember = workspace.members.some(
      m => m.user.toString() === user._id.toString()
    );

    // ⬇️ Nếu chưa → mời vào workspace
    if (!isWorkspaceMember) {
      workspace.members.push({
        user: user._id,
        role: "member",
        joinedAt: new Date()
      });

      await workspace.save();

      // thêm workspace vào user
      if (!user.workspaces.includes(workspace._id)) {
        user.workspaces.push(workspace._id);
        await user.save();
      }
    }

    // 5️⃣ Check user đã ở board chưa
    const isBoardMember = board.members.some(
      m => m.user.toString() === user._id.toString()
    );

    if (isBoardMember) {
      return res.status(400).json({ message: "User đã ở trong board" });
    }

    // 6️⃣ Thêm user vào board
    board.members.push({
      user: user._id,
      role: "member",
      joinedAt: new Date()
    });

    await board.save();

    res.status(200).json({
      message: "Mời user thành công",
      member: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        role: "member"
      }
    });

  } catch (err) {
    console.error("❌ inviteUser error:", err);
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
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin user từ token."
      });
    }

    const userId = req.user.id;

    const boards = await Board.find({
      $or: [
        { createdBy: userId },
        { "members.user": userId }
      ]
    })
      .populate("workspace", "name")
      .populate("createdBy", "username email avatar")
      .populate({
        path: "members.user",
        select: "username email avatar"
      })
      .sort({
        lastViewedAt: -1,
        createdAt: -1
      });

    return res.status(200).json({
      success: true,
      data: boards
    });
  } catch (error) {
    console.error("getBoardsrecent error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server"
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


//xoá 

export const clearCardsInList = async (req, res) => {
  try {
    const { listId } = req.params;

    // Kiểm tra list tồn tại
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ message: "List không tồn tại" });
    }

    // Xoá card trong DB
    await Card.deleteMany({ list: listId });

    // Clear mảng cards trong list
    list.cards = [];
    await list.save();
    // realtime
     req.io.to(list.board.toString()).emit("cards-cleared", {
      listId
    });


    res.json({
      message: "Đã xoá toàn bộ card trong list",
      listId,
    });
  } catch (err) {
    console.error("clearCardsInList error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/**
 * DELETE /v1/lists/:listId
 * Xoá list + toàn bộ card trong list
 */
export const deleteList = async (req, res) => {
  try {
    const { listId } = req.params;

    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ message: "List không tồn tại" });
    }

    await Card.deleteMany({ list: listId });
    await List.findByIdAndDelete(listId);
     req.io.to(list.board.toString()).emit("list-deleted", {
      listId
    });


    res.json({
      message: "Đã xoá list và toàn bộ card trong list",
      listId,
    });
  } catch (err) {
    console.error("deleteList error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
export const deleteCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    // 1. Tìm card
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card không tồn tại" });
    }

    const listId = card.list;

    // 2. Tìm list để lấy boardId
    const list = await List.findById(listId);
    if (!list) {
      return res.status(404).json({ message: "List không tồn tại" });
    }

    const boardId = list.board;

    // 3. Xoá card
    await Card.findByIdAndDelete(cardId);

    // 4. Gỡ card khỏi list.cards
    await List.findByIdAndUpdate(listId, {
      $pull: { cards: cardId }
    });

    // 5. 🔥 REALTIME
    req.io.to(boardId.toString()).emit("card-deleted", {
      cardId,
      listId
    });

    res.json({
      message: "Đã xoá card",
      cardId,
      listId
    });
  } catch (err) {
    console.error("deleteCard error:", err);
    res.status(500).json({ message: "Lỗi server" });
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