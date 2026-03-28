import express from "express";
import {
  getWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  enrollInWorkoutPlan,
  getUserWorkoutPlans,
  logWorkoutCompletion,
  getWorkoutPlanFilters,
  getPopularWorkoutPlans,
} from "../controllers/workoutController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getWorkoutPlans);
router.get("/popular", getPopularWorkoutPlans);
router.get("/filters", getWorkoutPlanFilters);
router.get("/:id", getWorkoutPlanById);

// Protected routes
router.use(protect);

// User routes
router.post("/:id/enroll", enrollInWorkoutPlan);
router.get("/user/plans", getUserWorkoutPlans);
router.post("/progress/:progressId/complete", logWorkoutCompletion);

// Trainer routes
router.post("/", authorize("trainer"), createWorkoutPlan);
router.put("/:id", authorize("trainer"), updateWorkoutPlan);
router.delete("/:id", authorize("trainer"), deleteWorkoutPlan);

export default router;