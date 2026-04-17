import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  createRequest,
  getUserRequests,
  getTrainerRequests,
  acceptRequest,
  rejectRequest,
  confirmRequestPayment,
  expireOverdueRequests,
  getRequestPaymentIntent,
  syncRequestPayment,
} from "../controllers/sessionRequestController.js";

const router = express.Router();
router.use(protect);

// User routes
router.post("/",                       authorize("user"),    createRequest);
router.get("/my",                      authorize("user"),    getUserRequests);
router.get("/:id/payment-intent",      authorize("user"),    getRequestPaymentIntent);
router.post("/:id/confirm-payment",    authorize("user"),    confirmRequestPayment);
router.post("/:id/sync-payment",       authorize("user"),    syncRequestPayment);

// Trainer routes
router.get("/trainer",              authorize("trainer"), getTrainerRequests);
router.put("/:id/accept",           authorize("trainer"), acceptRequest);
router.put("/:id/reject",           authorize("trainer"), rejectRequest);

// Internal / admin
router.post("/expire-overdue",      authorize("admin"),   expireOverdueRequests);

export default router;
