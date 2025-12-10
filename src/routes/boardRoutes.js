import express from "express";
import { createBoard,getBoardsByCurrentUser,getBoardById,createList,createCard,getCardsByList,inviteUser,getBoardsrecent,getCardById,updateCard,updateCardComplete,getBoardsByWorkspace } from "../controllers/boardController.js";
const router = express.Router();
import { verifyToken } from "../middlewares/verifyToken.js";
// POST /v1/board
router.post("/create",verifyToken,createBoard);
router.get("/myboards",verifyToken, getBoardsByCurrentUser);
router.get("/workspace/:workspaceId",verifyToken, getBoardsByWorkspace);

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
router.get("/get-card/cards/:id", getCardById);
router.put("/update-card/cards/:id", updateCard);
router.put("/complete/:cardId", updateCardComplete);


//mời user
router.post("/:boardId/invite", verifyToken, inviteUser);


export default router;
