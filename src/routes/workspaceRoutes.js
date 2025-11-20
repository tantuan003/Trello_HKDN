// routes/workspaceRoutes.js
import express from "express";
import { getUserWorkspaces, getWorkspaceMembers } from "../controllers/workspaceController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// Lấy workspace của user
router.get("/", verifyToken, getUserWorkspaces);

// Lấy members theo workspaceId
router.get("/:workspaceId/members", verifyToken, getWorkspaceMembers);

export default router;

