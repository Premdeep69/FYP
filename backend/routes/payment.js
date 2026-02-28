import express from "express";
import {
  createSessionPayment,
  createSubscription,
  getPaymentHistory,
  getUserSubscriptions,
  cancelSubscription,
  getTrainerEarnings,
  handleStripeWebhook,
  generatePaymentInvoice,
  downloadInvoice,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  refundPayment,
  getPaymentStatistics,
  verifyPaymentStatus,
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

// Payment statistics
router.get("/statistics", getPaymentStatistics);

// Invoice generation
router.post("/invoice/:paymentId", generatePaymentInvoice);
router.get("/invoice/download/:filename", downloadInvoice);

// Payment methods
router.get("/methods", getPaymentMethods);
router.post("/methods", addPaymentMethod);
router.delete("/methods/:paymentMethodId", removePaymentMethod);
router.put("/methods/default", setDefaultPaymentMethod);

// Payment verification
router.get("/verify/:paymentIntentId", verifyPaymentStatus);

// Refunds (admin/trainer only)
router.post("/refund/:paymentId", authorize("trainer", "admin"), refundPayment);

// Trainer earnings (trainers only)
router.get("/earnings", authorize("trainer"), getTrainerEarnings);

export default router;