// routes/workspaceRoutes.js
import express from "express";
import { 
    getUserWorkspaces, 
    getWorkspaceMembers,
    inviteUserByEmail,
    updateWorkspaceName,
    updateWorkspaceVisibility } from "../controllers/workspaceController.js";

import { verifyToken } from "../middlewares/verifyToken.js";


const router = express.Router();

// Lấy workspace của user
router.get("/", verifyToken, getUserWorkspaces);

// Lấy members theo workspaceId
router.get("/:workspaceId/members", verifyToken, getWorkspaceMembers);

// Mời user vào workspace theo email
router.post("/:workspaceId/invite", verifyToken, inviteUserByEmail);

// Cập nhật tên workspace
router.put("/:workspaceId/update-name", verifyToken, updateWorkspaceName);

// Cập nhật trạng thái công khai/riêng tư của workspace
router.put("/:workspaceId/update-visibility", verifyToken, updateWorkspaceVisibility);

export default router;

