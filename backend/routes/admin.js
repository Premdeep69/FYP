import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getStats,
  getAllUsers,
  getAllTrainers,
  getPendingTrainers,
  verifyTrainer,
  rejectTrainer,
  getAllPayments,
  getPaymentById,
  toggleUserActive,
  addTrainer,
  deleteUser,
} from "../controllers/adminController.js";
import {
  getExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  restoreExercise,
  permanentlyDeleteExercise,
} from "../controllers/exerciseController.js";
import {
  getWorkoutPlans,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
} from "../controllers/workoutController.js";

const router = express.Router();

// All routes require admin auth
router.use(protect, authorize("admin"));

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.get("/trainers", getAllTrainers);
router.get("/trainers/pending", getPendingTrainers);
router.put("/trainers/:id/verify", verifyTrainer);
router.put("/trainers/:id/reject", rejectTrainer);
router.get("/payments", getAllPayments);
router.get("/payments/:id", getPaymentById);
router.put("/users/:id/toggle-active", toggleUserActive);
router.delete("/users/:id", deleteUser);
router.post("/trainers", addTrainer);

// Admin exercise management (bypasses isActive filter for full visibility)
router.get("/exercises", async (req, res) => {
  req.query.isAdmin = "true";
  return getExercises(req, res);
});
router.post("/exercises", createExercise);
router.put("/exercises/:id", updateExercise);
router.delete("/exercises/:id", deleteExercise);
router.post("/exercises/:id/restore", restoreExercise);
router.delete("/exercises/:id/permanent", permanentlyDeleteExercise);

// Admin workout plan management
router.get("/workout-plans", async (req, res) => {
  // Delete the isPublic key so the controller's admin-check branch fires
  delete req.query.isPublic;
  return getWorkoutPlans(req, res);
});
router.post("/workout-plans", createWorkoutPlan);
router.put("/workout-plans/:id", updateWorkoutPlan);
router.delete("/workout-plans/:id", deleteWorkoutPlan);

export default router;
