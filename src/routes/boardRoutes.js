import express from "express";
import { createBoard,getBoardsByCurrentUser,getBoardById,createList,createCard,getCardsByList,inviteUser,getBoardsrecent,getCardById,updateCard,updateCardComplete,getBoardsByWorkspace,clearCardsInList,deleteList,deleteCard,deleteBoard,updateBoardMemberRole,updateBoardTitle,updateBoardVisibility,updateListTitle,updateBoardBackground,
  uploadBackground } from "../controllers/boardController.js";
const router = express.Router();
import { 
    createBoard,
    getBoardsByCurrentUser,
    getBoardById,
    createList,
    createCard,
    getCardsByList,
    inviteUser,
    getBoardsrecent,
    getCardById,
    updateCard,
    updateCardComplete,
    getBoardsByWorkspace,
    clearCardsInList,
    deleteList,
    deleteCard,
    deleteBoard,
    updateBoardMemberRole,
    updateBoardTitle,
    updateBoardVisibility,
    updateListTitle, 
    getPublicBoards, 
    removeBoardMember,
    getBoardMembers 
} from "../controllers/boardController.js";

import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

router.post("/create",verifyToken,createBoard);
router.get("/myboards",verifyToken, getBoardsByCurrentUser);
router.get("/workspace/:workspaceId",verifyToken, getBoardsByWorkspace);
router.get("/public", getPublicBoards);

router.delete("/card/:cardId", verifyToken, deleteCard);
router.delete("/board/:boardId", verifyToken, deleteBoard);
router.delete("/:listId/clear-cards", verifyToken, clearCardsInList);
router.delete("/:listId", verifyToken, deleteList);
router.delete("/:boardId/members/:userId",verifyToken,removeBoardMember);

//board recent
router.get("/recent", verifyToken, getBoardsrecent);

//load list
router.get("/:boardId", verifyToken, getBoardById);
//tạo list
router.post("/create-list/:boardId", verifyToken, createList);

// Tạo card trong 1 list 
router.post("/create-card/:listId", verifyToken, createCard);

// Lấy toàn bộ card theo list
router.get("/get-card/:listId", getCardsByList);
router.get("/get-card/cards/:id", getCardById);
router.put("/update-card/cards/:id", updateCard);
router.put("/complete/:cardId", updateCardComplete);

//chỉnh role
router.put("/:boardId/member-role", verifyToken, updateBoardMemberRole);

//chỉnh tên board
router.put("/:boardId/title", verifyToken, updateBoardTitle);
//

router.put("/:boardId/background", verifyToken, updateBoardBackground);
router.post("/background/upload", verifyToken, uploadBackground);
//chỉnh visibility
router.put("/:boardId/visibility", verifyToken, updateBoardVisibility);

// sửa tên list
router.put("/list/:listId", verifyToken, updateListTitle);
//mời user
router.post("/:boardId/invite", verifyToken, inviteUser);

// lấy member board
// routes/boardRoutes.js
router.get("/:boardId/members",verifyToken,getBoardMembers
);

export default router;