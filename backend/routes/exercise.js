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
  bulkCreateExercises,
  bulkUpdateExercises,
  bulkDeleteExercises,
  duplicateExercise,
  getExerciseStats,
  searchExercises,
  getSimilarExercises,
  getFavoriteExercises,
  addToFavorites,
  removeFromFavorites,
  getTrainerExercises,
  restoreExercise,
  permanentlyDeleteExercise,
} from "../controllers/exerciseController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getExercises);
router.get("/popular", getPopularExercises);
router.get("/filters", getExerciseFilters);
router.get("/stats", getExerciseStats);
router.get("/search", searchExercises);
router.get("/muscle-group/:muscleGroup", getExercisesByMuscleGroup);
router.get("/trainer/:trainerId", getTrainerExercises);
router.get("/:id", getExerciseById);
router.get("/:id/similar", getSimilarExercises);

// Protected routes (authenticated users)
router.use(protect);

// Favorites
router.get("/user/favorites", getFavoriteExercises);
router.post("/:id/favorite", addToFavorites);
router.delete("/:id/favorite", removeFromFavorites);

// Rate exercise
router.post("/:id/rate", rateExercise);

// Trainer routes
router.post("/", authorize("trainer"), createExercise);
router.put("/:id", authorize("trainer"), updateExercise);
router.delete("/:id", authorize("trainer"), deleteExercise);
router.post("/:id/duplicate", authorize("trainer"), duplicateExercise);

// Bulk operations (trainer only)
router.post("/bulk/create", authorize("trainer"), bulkCreateExercises);
router.put("/bulk/update", authorize("trainer"), bulkUpdateExercises);
router.delete("/bulk/delete", authorize("trainer"), bulkDeleteExercises);

// Admin routes (if you have admin role)
// router.post("/:id/restore", authorize("admin"), restoreExercise);
// router.delete("/:id/permanent", authorize("admin"), permanentlyDeleteExercise);

export default router;