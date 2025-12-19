// src/server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import userRoutes from "./routes/UserRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import Card from "./models/CardModel.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import cors from "cors";
import { SOCKET_URL } from "./config/config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(cors({
  origin: process.env.SOCKET_URL, // URL ngrok của bạn
  credentials: true // nếu bạn dùng cookie
}));
app.use((req, res, next) => {
  req.io = io;   // 👈 thêm io vào req
  next();
});
app.use("/v1/User", userRoutes);
app.use("/v1/board", boardRoutes);
app.use("/v1/workspace", workspaceRoutes);
app.use("/v1/upload", uploadRoutes);

app.use(express.static(path.join(__dirname, "../public")));
// Route thử
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "login.html"));
});
connectDB();

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_URL,
    credentials: true
  }
});
io.use((socket, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const COOKIE_NAME = process.env.COOKIE_NAME || "token";

  try {
    // Đọc raw cookie header
    const cookieHeader = socket.request.headers.cookie;
    if (!cookieHeader) {
      console.log("❌ No cookie header");
      return next(new Error("Authentication error"));
    }

    // Parse cookie
    const cookies = cookie.parse(cookieHeader);

    // COOKIE_NAME là tên cookie bạn dùng ở res.cookie(COOKIE_NAME, token)
    const token = cookies[COOKIE_NAME];
    if (!token) {
      console.log("❌ No token in cookies");
      return next(new Error("Authentication error"));
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Gắn user ID vào socket để dùng ở sự kiện sau này
    socket.user = decoded.id;

    next();
  } catch (err) {
    console.log("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

app.set("socketio", io);
// Socket.io logic
// Socket.io logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  // Tham gia workspace
  socket.on("joinWorkspace", (workspaceId) => {
    socket.join(workspaceId);
    console.log(`🧩 Socket ${socket.id} joined workspace ${workspaceId}`);
  });

  // Tham gia board (dành cho list, card, ...)
  socket.on("joinBoard", (boardId) => {
    socket.join(boardId.toString());
    console.log(`🧩 Socket ${socket.id} joined board ${boardId}`);
  });
  socket.on("card:join", (cardId) => {
    socket.join(cardId);
    console.log(`Socket ${socket.id} joined card ${cardId}`);
  });
  // đổi thêm card
  socket.on("card:updateName", async ({ cardId, name }) => {
    const card = await Card.findById(cardId)
      .populate({
        path: "list",
        populate: { path: "board" }
      });

    if (!card) return;

    card.name = name;
    await card.save();

    // Emit tới card detail room
    io.to(card._id.toString()).emit("card:nameUpdated", { cardId, name });

    // Emit tới tất cả client đang ở board (board list view)
    if (card.list && card.list.board && card.list.board._id) {
      io.to(card.list.board._id.toString()).emit("card:nameUpdated", { cardId, name });
    }
  });


  socket.on("card:updateDescription", async ({ cardId, description }) => {
    try {
      const card = await Card.findById(cardId);
      if (!card) return;

      card.description = description;
      await card.save();

      // Phát tới các client khác trong cùng card
      socket.to(cardId).emit("card:descriptionUpdated", { description });
    } catch (err) {
      console.error("Error updating card name:", err);
    }
  });
  //thêm label
  // Khi client emit thêm label
  socket.on("card:addLabel", async ({ cardId, color }) => {
    try {
      const card = await Card.findById(cardId)
        .populate({
          path: "list",
          populate: { path: "board" }
        });
      console.log("board id là", card.list.board._id);

      if (!card) return;

      // Thêm label nếu chưa có
      if (!card.labels.includes(color)) {
        card.labels.push(color);
        await card.save();
      }

      // Emit tới card detail (các client đang mở card)
      io.to(card._id.toString()).emit("card:labelAdded", { cardId, color });

      // Emit tới tất cả client trong board (bao gồm board view)
      if (card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit("card:labelAdded", { cardId, color });
      }

    } catch (err) {
      console.error("Error updating card label:", err);
    }
  });

  socket.on("card:removeLabel", async ({ cardId, color }) => {
    try {
      const card = await Card.findById(cardId)
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      if (!card) return;

      // Remove label
      card.labels = card.labels.filter(c => c !== color);
      await card.save();

      // Emit tới card detail (nếu đang mở)
      io.to(card._id.toString()).emit("card:labelRemoved", { cardId, color });

      // Emit tới tất cả client ở board (board list view)
      if (card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit("card:labelRemoved", { cardId, color });
      }
    } catch (err) {
      console.error("Error removing label:", err);
    }
  });
  socket.on("card:assignMember", async ({ cardId, userId }) => {
    try {
      const card = await Card.findById(cardId)
        .populate("assignedTo")
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      if (!card) return;

      if (!card.assignedTo.find(m => m._id.toString() === userId)) {
        card.assignedTo.push(userId);
        await card.save();
      }

      const updated = await Card.findById(cardId)
        .populate("assignedTo")
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      const assignedMembers = updated.assignedTo.map(m => m._id.toString());

      console.log("EMIT assign to rooms:", cardId, updated.list.board._id.toString());

      // Gửi cho card detail
      io.to(cardId).emit("card:assignedMembersUpdated", {
        cardId,
        assignedMembers
      });

      // Gửi cho board list
      io.to(updated.list.board._id.toString()).emit("card:assignedMembersUpdated", {
        cardId,
        assignedMembers
      });

    } catch (err) {
      console.error("Error assign member:", err);
    }
  });


  socket.on("card:removeMember", async ({ cardId, userId }) => {
    try {
      const card = await Card.findById(cardId)
        .populate("assignedTo")
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      if (!card) return;

      card.assignedTo = card.assignedTo.filter(m => m._id.toString() !== userId);
      await card.save();

      const updated = await Card.findById(cardId)
        .populate("assignedTo")
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      const assignedMembers = updated.assignedTo.map(m => m._id.toString());

      console.log("EMIT remove to rooms:", cardId, updated.list.board._id.toString());

      io.to(cardId).emit("card:assignedMembersUpdated", {
        cardId,
        assignedMembers
      });

      io.to(updated.list.board._id.toString()).emit("card:assignedMembersUpdated", {
        cardId,
        assignedMembers
      });

    } catch (err) {
      console.error("Error remove member:", err);
    }
  });

  //due date
  socket.on("card:updateDueDate", async ({ cardId, dueDate }) => {
    try {
      const card = await Card.findById(cardId)
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      if (!card) return;

      card.dueDate = dueDate;
      await card.save();

      // Gửi realtime cho client đang mở card detail
      io.to(cardId).emit("card:dueDateUpdated", {
        cardId,
        dueDate: card.dueDate
      });

      // Gửi cho tất cả client trong board view
      if (card.list && card.list.board && card.list.board._id) {
        io.to(card.list.board._id.toString()).emit("card:dueDateUpdated", {
          cardId,
          dueDate: card.dueDate
        });
      }

    } catch (err) {
      console.error("Error updating due date:", err);
    }
  });

  // Thêm attachment
  socket.on("card:updateAttachments", async ({ cardId, file }) => {
    try {
      const card = await Card.findById(cardId)
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      if (!card) return;

      // Thêm file
      card.attachments.push(file);
      await card.save();

      const boardId = card.list.board._id.toString();

      // Gửi full danh sách attachments
      io.to(cardId).emit("card:attachmentsUpdated", {
        cardId,
        attachments: card.attachments
      });

      io.to(boardId).emit("card:attachmentsUpdated", {
        cardId,
        attachments: card.attachments
      });

    } catch (err) {
      console.error("Error updating attachments:", err);
    }
  });


  // ===================== REMOVE ATTACHMENT ===================== //

  socket.on("card:removeAttachment", async ({ cardId, fileName }) => {
    try {
      const card = await Card.findById(cardId)
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      if (!card) return;

      card.attachments = card.attachments.filter(f => f.name !== fileName);
      await card.save();

      const boardId = card.list.board._id.toString();

      // Realtime cho người đang mở card
      io.to(cardId).emit("card:attachmentRemoved", {
        cardId,
        fileName
      });

      // Realtime cho người đang xem board
      io.to(boardId).emit("card:attachmentRemoved", {
        cardId,
        fileName
      });

    } catch (err) {
      console.error("Error removing attachment:", err);
    }
  });

  //comment
  // Thêm comment vào card
  socket.on("card:addComment", async ({ cardId, text }) => {
    try {
      if (!socket.user) return;

      // Tìm card + lấy luôn boardId để gửi realtime
      const card = await Card.findById(cardId)
        .populate({
          path: "list",
          populate: { path: "board" }
        });

      if (!card) return;

      // Tạo comment
      const comment = {
        user: socket.user,
        text,
        createdAt: new Date()
      };

      // Lưu DB
      card.comments.push(comment);
      await card.save();

      // Populate user cho comment cuối
      const populated = await Card.findById(cardId)
        .populate("comments.user", "username");

      const newComment = populated.comments.slice(-1)[0];

      // Lấy boardId
      const boardId = card.list.board._id.toString();

      // 🔥 Realtime cho người đang mở card detail
      io.to(cardId).emit("card:commentAdded", {
        cardId,
        comment: newComment
      });

      // 🔥 Realtime cho những người đang xem board (card list)
      io.to(boardId).emit("board:commentAdded", {
        cardId,
        comment: newComment
      });

    } catch (err) {
      console.error("Error adding comment:", err);
    }
  });

  //checkbox complete
  socket.on("card:completeToggle", ({ cardId, complete }) => {
    socket.broadcast.emit("card:completeUpdated", { cardId, complete });
  });
  socket.on("clear-cards", ({ listId, boardId }) => {
    // chỉ emit, DB xử lý ở controller
    io.to(boardId).emit("cards-cleared", {
      listId
    });
  });

  // =============================
  // 🗑️ DELETE LIST
  // =============================
  socket.on("delete-list", ({ listId, boardId }) => {
    io.to(boardId).emit("list-deleted", {
      listId
    });
  });

  socket.on("delete-card", ({ cardId, boardId }) => {
    io.to(boardId).emit("card-deleted", {
      listId
    });
  });



  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
const PORT = 8127;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
