// routes/workspaceRoutes.js
import express from "express";
import { getUserWorkspaces, getWorkspaceMembers } from "../controllers/workspaceController.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { inviteUserByEmail } from "../controllers/workspaceController.js";

const router = express.Router();

// Lấy workspace của user
router.get("/", verifyToken, getUserWorkspaces);

// Lấy members theo workspaceId
router.get("/:workspaceId/members", verifyToken, getWorkspaceMembers);

// Mời user vào workspace theo email
router.post("/:workspaceId/invite", verifyToken, inviteUserByEmail);

export default router;

