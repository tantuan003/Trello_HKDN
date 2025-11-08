import express from "express";
import { createBoard,getBoardsByCurrentUser } from "../controllers/boardController.js";
const router = express.Router();
import { verifyToken } from "../middlewares/verifyToken.js";
// POST /v1/board/create
router.post("/create", createBoard);
router.get("/myboards",verifyToken, getBoardsByCurrentUser);

export default router;
