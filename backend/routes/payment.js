import express from "express";
import {
  createSessionPayment,
  createSubscription,
  getPaymentHistory,
  getUserSubscriptions,
  cancelSubscription,
  getTrainerEarnings,
  handleStripeWebhook,
} from "../controllers/paymentController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Webhook route (must be before other middleware)
router.post("/webhook", express.raw({ type: 'application/json' }), handleStripeWebhook);

// Protected routes
router.use(protect);

// Session payments
router.post("/session", createSessionPayment);

// Subscriptions
router.post("/subscription", createSubscription);
router.get("/subscriptions", getUserSubscriptions);
router.put("/subscriptions/:subscriptionId/cancel", cancelSubscription);

// Payment history
router.get("/history", getPaymentHistory);

// Trainer earnings (trainers only)
router.get("/earnings", authorize("trainer"), getTrainerEarnings);

export default router;