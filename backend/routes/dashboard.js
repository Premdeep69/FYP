import express from "express";
import { 
  getUserDashboard, 
  getTrainerDashboard, 
  logWorkout, 
  updateGoals,
  getWorkoutAnalytics,
  getWorkoutHistory,
  updateWorkout,
  deleteWorkout,
  updateProfile,
  updateTrainerProfile
} from "../controllers/dashboardController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Protected routes
router.use(protect);

// User dashboard - only users can access
router.get("/user", authorize("user"), getUserDashboard);

// Trainer dashboard - only trainers can access
router.get("/trainer", authorize("trainer"), getTrainerDashboard);

// Workout management - both users and trainers
router.post("/workout", logWorkout);
router.get("/workouts", getWorkoutHistory);
router.put("/workout/:workoutId", updateWorkout);
router.delete("/workout/:workoutId", deleteWorkout);

// Analytics
router.get("/analytics", getWorkoutAnalytics);

// Goals management - both users and trainers
router.put("/goals", updateGoals);

// Profile update
router.put("/profile", updateProfile);
router.put("/trainer-profile", updateTrainerProfile);

export default router;