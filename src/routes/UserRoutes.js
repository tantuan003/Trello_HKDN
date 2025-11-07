import express from "express";
import { registerUser } from "../controllers/UserController.js";
import { CreateUser_validation } from "../middlewares/Validation.js";
import { loginUser } from "../controllers/AuthController.js";

const router = express.Router();

router.post("/register", CreateUser_validation, registerUser);
router.post("/login", loginUser);

export default router;
