import express from "express";
import { createBoard,getBoardsByCurrentUser,getBoardById } from "../controllers/boardController.js";
const router = express.Router();
import { verifyToken } from "../middlewares/verifyToken.js";
// POST /v1/board
router.post("/create",verifyToken,createBoard);
router.get("/myboards",verifyToken, getBoardsByCurrentUser);

//load boards
router.get("/:boardId", getBoardById);

export default router;
