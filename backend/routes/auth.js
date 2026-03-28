import express from "express";
import { registerUser, loginUser, getTrainers } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/trainers", getTrainers);

export default router;
