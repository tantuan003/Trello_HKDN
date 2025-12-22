// routes/workspaceRoutes.js
import express from "express";
import { 
    getWorkspaceById,
    getUserWorkspaces, 
    getWorkspaceMembers,
    inviteUserByEmail,
    updateWorkspaceName,
    updateWorkspaceVisibility,
createWorkspace,updateMemberRole } from "../controllers/workspaceController.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { checkOwnerWorkspace } from "../middlewares/checkowner.js";


const router = express.Router();

// Lấy workspace của user
router.get("/", verifyToken, getUserWorkspaces);

// Lấy thông tin workspace
router.get("/:workspaceId", verifyToken, getWorkspaceById);
// tạo workspace mới 
router.post("/create", verifyToken, createWorkspace);


// Lấy members theo workspaceId
router.get("/:workspaceId/members", verifyToken, getWorkspaceMembers);

// Mời user vào workspace theo email
router.post("/:workspaceId/invite", verifyToken, inviteUserByEmail);

// Cập nhật tên workspace
router.put("/:workspaceId/update-name", verifyToken, updateWorkspaceName);

// Cập nhật trạng thái công khai/riêng tư của workspace
router.put("/:workspaceId/update-visibility", verifyToken, updateWorkspaceVisibility);

// chỉnh sửa role cho member trong workspace

router.put("/:workspaceId/members/:memberId/role",  verifyToken,checkOwnerWorkspace,updateMemberRole);


export default router;

