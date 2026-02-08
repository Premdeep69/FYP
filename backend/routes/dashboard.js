import express from "express";
import { 
  getUserDashboard, 
  getTrainerDashboard, 
  logWorkout, 
  updateGoals 
} from "../controllers/dashboardController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Protected routes
router.use(protect);

// User dashboard
router.get("/user", authorize("user"), getUserDashboard);

// Trainer dashboard
router.get("/trainer", authorize("trainer"), getTrainerDashboard);

// Log workout (users only)
router.post("/workout", authorize("user"), logWorkout);

// Update goals (users only)
router.put("/goals", authorize("user"), updateGoals);

export default router;