// server.js
// src/server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // Cho phép frontend truy cập
});

app.use(express.json());

// Route thử
app.get("/", (req, res) => {
  res.send("Hello Trello Clone!");
});

// Lắng nghe socket.io
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 8127;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
