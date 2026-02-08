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

// User dashboard - only users can access
router.get("/user", authorize("user"), getUserDashboard);

// Trainer dashboard - only trainers can access
router.get("/trainer", authorize("trainer"), getTrainerDashboard);

// Log workout - both users and trainers can log workouts
router.post("/workout", logWorkout);

// Update goals - both users and trainers can update goals
router.put("/goals", updateGoals);

export default router;