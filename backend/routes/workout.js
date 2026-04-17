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
  rateWorkoutPlan,
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
router.post("/:id/rate", rateWorkoutPlan);
router.get("/user/plans", getUserWorkoutPlans);
router.post("/progress/:progressId/complete", logWorkoutCompletion);

// Trainer/Admin routes
router.post("/", authorize("trainer", "admin"), createWorkoutPlan);
router.put("/:id", authorize("trainer", "admin"), updateWorkoutPlan);
router.delete("/:id", authorize("trainer", "admin"), deleteWorkoutPlan);

export default router;