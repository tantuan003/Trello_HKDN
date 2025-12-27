// routes/activity.routes.js
import express from "express";
import { getBoardActivities } from "../controllers/ActivityController.js";
// v1/activitys
const router = express.Router();

router.get("/boards/:boardId/activities", getBoardActivities);

export default router;
