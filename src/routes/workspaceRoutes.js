// routes/workspaceRoutes.js
import express from "express";
import { 
    getWorkspaceById,
    getUserWorkspaces,
    getWorkspaceMembers,
    inviteUserByEmail,
    updateWorkspaceName,
    updateWorkspaceVisibility,
    createWorkspace,
    updateMemberRole,
    removeMember,
    deleteWorkspace } from "../controllers/workspaceController.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { checkOwnerWorkspace } from "../middlewares/checkowner.js";


const router = express.Router();

router.get("/", verifyToken, getUserWorkspaces);

router.get("/:workspaceId", verifyToken, getWorkspaceById);

router.post("/create", verifyToken, createWorkspace);

router.get("/:workspaceId/members", verifyToken, getWorkspaceMembers);

router.post("/:workspaceId/invite", verifyToken, inviteUserByEmail);

router.put("/:workspaceId/update-name", verifyToken, updateWorkspaceName);

router.put("/:workspaceId/update-visibility", verifyToken, updateWorkspaceVisibility);

router.put("/:workspaceId/members/:memberId/role",  verifyToken,checkOwnerWorkspace,updateMemberRole);

router.delete("/:workspaceId", verifyToken, checkOwnerWorkspace, deleteWorkspace);

router.delete("/:workspaceId/members/:memberId", verifyToken, checkOwnerWorkspace, removeMember);


export default router;

