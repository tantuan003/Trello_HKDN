import express from "express";
import { createBoard,getBoardsByCurrentUser,getBoardById,createList,createCard,getCardsByList,inviteUser,getBoardsrecent } from "../controllers/boardController.js";
const router = express.Router();
import { verifyToken } from "../middlewares/verifyToken.js";
// POST /v1/board
router.post("/create",verifyToken,createBoard);
router.get("/myboards",verifyToken, getBoardsByCurrentUser);
//board recent
router.get("/recent", verifyToken, getBoardsrecent);

//load list
router.get("/:boardId", getBoardById);
//tạo list
router.post("/create-list/:boardId",createList);

// Tạo card trong 1 list 
router.post("/create-card/:listId",verifyToken, createCard);

// Lấy toàn bộ card theo list
router.get("/get-card/:listId", getCardsByList);

//mời user
router.post("/:boardId/invite", verifyToken, inviteUser);


export default router;
