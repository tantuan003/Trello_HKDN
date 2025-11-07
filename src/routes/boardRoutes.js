import express from "express";
import { createBoard,getBoardsByUser } from "../controllers/boardController.js";
const router = express.Router();

// POST /v1/board/create
router.post("/create", createBoard);
router.get("/user/:userId", getBoardsByUser);

export default router;
