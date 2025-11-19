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
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: true })); // để nhận form dữ liệu
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // Cho phép frontend truy cập
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
  res.sendFile(path.join(__dirname,"../public","home.html"));
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
});
const PORT = 8127;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
