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
} from "../controllers/adminController.js";

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
router.post("/trainers", addTrainer);

export default router;
