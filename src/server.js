// src/server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import userRoutes from "./routes/UserRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

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

// Route API
app.use("/v1/User", userRoutes);
app.use("/v1/board", boardRoutes);

// ⚙️ Public nằm cùng cấp với src
app.use(express.static(path.join(__dirname, "../Public")));


connectDB();

// Route thử
app.get("/", (req, res) => {
  res.send("Hello Trello Clone!");
});

// Socket.io logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
  socket.on("joinWorkspace", (workspaceId) => {
    socket.join(workspaceId);
    console.log(`🧩 Socket ${socket.id} joined workspace ${workspaceId}`);
  });
});

const PORT = 8127;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
