import express from "express";
import { createBoard } from "../controllers/boardController.js";
const router = express.Router();

// POST /v1/board/create
router.post("/create", createBoard);

export default router;
