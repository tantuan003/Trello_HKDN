// routes/workspaceRoutes.js
import express from "express";
import { getUserWorkspaces } from "../controllers/workspaceController.js";
import {verifyToken} from "../middlewares/verifyToken.js";
const router = express.Router(); 
router.get("/", verifyToken, getUserWorkspaces);


export default router;
