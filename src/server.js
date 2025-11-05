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
app.use(express.json());

app.use("/v1/board", boardRoutes);

// ⚙️ Public nằm cùng cấp với src
app.use(express.static(path.join(__dirname, "../Public")));

app.use("/v1/User", userRoutes);

connectDB();

// Route thử
app.get("/", (req, res) => {
  res.send("Hello Trello Clone!");
});

// Socket.io
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 8127;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
