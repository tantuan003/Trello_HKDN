import express from "express";
import { registerUser } from "../controllers/UserController.js";
import { CreateUser_validation } from "../middlewares/Validation.js";

const router = express.Router();

router.post("/register", CreateUser_validation, registerUser);

export default router;
