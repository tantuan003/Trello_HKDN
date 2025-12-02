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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: true })); // để nhận form dữ liệu
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:8127",
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
app.use(express.json());
app.use(cookieParser());
// Route API
app.use("/v1/User", userRoutes);
app.use("/v1/board", boardRoutes);
app.use("/v1/workspace", workspaceRoutes);
app.use("/v1/upload", uploadRoutes);
// ⚙️ Public nằm cùng cấp với src
app.use(express.static(path.join(__dirname, "../public")));


connectDB();

// Route thử
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "login.html"));
});

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
    socket.join(boardId);
    console.log(`🧩 Socket ${socket.id} joined board ${boardId}`);
  });
  socket.on("card:join", (cardId) => {
    socket.join(cardId);
    console.log(`Socket ${socket.id} joined card ${cardId}`);
  });
  // đổi thêm card
  socket.on("card:updateName", async ({ cardId, name }) => {
  const card = await Card.findById(cardId);
  if (!card) return;
  card.name = name;
  await card.save();

  // Broadcast tới tất cả client trong room cardId
  io.in(cardId).emit("card:nameUpdated", { cardId, name });
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
      const card = await Card.findById(cardId);
      if (!card) return;

      if (!Array.isArray(card.labels)) card.labels = [];
      if (!card.labels.includes(color)) {
        card.labels.push(color);
        await card.save();
      }

      // ⚠️ Gửi cho tất cả client trong room, bao gồm client hiện tại
      io.to(cardId).emit("card:labelAdded", { cardId, color });
    } catch (err) {
      console.error("Error updating card label:", err);
    }
  });
  socket.on("card:removeLabel", async ({ cardId, color }) => {
    try {
      const card = await Card.findById(cardId);
      if (!card) return;

      card.labels = card.labels.filter(c => c !== color);
      await card.save();

      socket.to(cardId).emit("card:labelRemoved", { cardId, color });
    } catch (err) {
      console.error("Error removing label:", err);
    }
  });
  //assign member
  socket.on("card:assignMember", async ({ cardId, userId }) => {
    try {
      const card = await Card.findById(cardId).populate("assignedTo");

      if (!card.assignedTo.find(m => m._id.toString() === userId)) {
        card.assignedTo.push(userId);
        await card.save();
      }

      const populated = await Card.findById(cardId).populate("assignedTo");

      // Gửi cho tất cả client trong card, bao gồm cả người thao tác
      io.to(cardId).emit("card:memberAssigned", {
        cardId,
        assignedTo: populated.assignedTo,
      });


    } catch (err) {
      console.error("Error assigning member:", err);
    }
  });
  socket.on("card:removeMember", async ({ cardId, userId }) => {
    try {
      const card = await Card.findById(cardId).populate("assignedTo");
      if (!card) return;

      card.assignedTo = card.assignedTo.filter(m => m._id.toString() !== userId);
      await card.save();

      const populated = await Card.findById(cardId).populate("assignedTo");

      io.to(cardId).emit("card:memberAssigned", {
        cardId,
        assignedTo: populated.assignedTo
      });
    } catch (err) {
      console.error("Error removing member:", err);
    }
  });

  //due date
  socket.on("card:updateDueDate", async ({ cardId, dueDate }) => {
    try {
      const card = await Card.findById(cardId);
      if (!card) return;

      card.dueDate = dueDate;
      await card.save();

      // Gửi realtime cho tất cả client trong card
      io.to(cardId).emit("card:dueDateUpdated", { dueDate: card.dueDate });
    } catch (err) {
      console.error("Error updating due date:", err);
    }
  });
  // Thêm attachment
  socket.on("card:updateAttachments", async ({ cardId, file }) => {
    try {
      const card = await Card.findById(cardId);
      if (!card) return;

      if (!Array.isArray(card.attachments)) card.attachments = [];
      card.attachments.push(file);
      await card.save();

      // Gửi realtime cho các client khác trong card
      socket.to(cardId).emit("card:attachmentsUpdated", { file });
    } catch (err) {
      console.error("Error updating attachments:", err);
    }
  });

  // Xóa attachment
  socket.on("card:removeAttachment", async ({ cardId, fileName }) => {
    try {
      const card = await Card.findById(cardId);
      if (!card) return;

      card.attachments = card.attachments.filter(f => f.name !== fileName);
      await card.save();

      socket.to(cardId).emit("card:attachmentRemoved", { fileName });
    } catch (err) {
      console.error("Error removing attachment:", err);
    }
  });
  //comment
  // Thêm comment vào card
  socket.on("card:addComment", async ({ cardId, text }) => {
    try {
      if (!socket.user) return;

      const card = await Card.findById(cardId);
      if (!card) return;

      const comment = { user: socket.user, text, createdAt: new Date() };
      card.comments.push(comment);
      await card.save();

      const populated = await Card.findById(cardId).populate("comments.user", "username");
      io.to(cardId).emit("card:commentAdded", { cardId, comment: populated.comments.slice(-1)[0] });

    } catch (err) {
      console.error("Error adding comment:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
const PORT = 8127;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
