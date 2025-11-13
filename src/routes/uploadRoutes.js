import express from "express";
import { uploadBackground } from "../controllers/boardController.js"
const router = express.Router();

router.post("/bg", uploadBackground);

export default router;

