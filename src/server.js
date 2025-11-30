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
    try {
      const card = await Card.findById(cardId);
      if (!card) return;

      card.name = name;
      await card.save();

      // Phát tới các client khác trong cùng card
      socket.to(cardId).emit("card:nameUpdated", { name });
    } catch (err) {
      console.error("Error updating card name:", err);
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

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
const PORT = 8127;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
