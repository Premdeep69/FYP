import express from "express";
import {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  getExerciseFilters,
  rateExercise,
  getPopularExercises,
  getExercisesByMuscleGroup,
} from "../controllers/exerciseController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getExercises);
router.get("/popular", getPopularExercises);
router.get("/filters", getExerciseFilters);
router.get("/muscle-group/:muscleGroup", getExercisesByMuscleGroup);
router.get("/:id", getExerciseById);

// Protected routes
router.use(protect);

// Rate exercise (authenticated users)
router.post("/:id/rate", rateExercise);

// Create, update, delete exercises (trainers only)
router.post("/", authorize("trainer"), createExercise);
router.put("/:id", authorize("trainer"), updateExercise);
router.delete("/:id", authorize("trainer"), deleteExercise);

export default router;