import express from "express";
import bookingController from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/trainers", bookingController.getAllTrainers);
router.get("/trainers/:trainerId", bookingController.getTrainerById);
router.get("/trainers/:trainerId/slots", bookingController.getAvailableSlots);

// Protected routes - User bookings
router.post("/", protect, bookingController.createBooking);
router.get("/my-bookings", protect, bookingController.getUserBookings);
router.put("/:bookingId/status", protect, bookingController.updateBookingStatus);
router.post("/:bookingId/feedback", protect, bookingController.addFeedback);
router.post("/:bookingId/confirm-payment", protect, bookingController.confirmBookingPayment);
router.post("/:bookingId/cancel-with-refund", protect, bookingController.cancelBookingWithRefund);

// Protected routes - Trainer management
router.get("/trainer/bookings", protect, bookingController.getTrainerBookings);
router.get("/trainer/test", protect, (req, res) => {
  res.json({ message: "Test endpoint works", userId: req.user._id, userType: req.user.userType });
});
router.put("/trainer/availability", protect, bookingController.updateAvailability);
router.post("/trainer/blocked-slots", protect, bookingController.addBlockedSlot);
router.put("/trainer/pricing", protect, bookingController.updatePricing);
router.get("/trainer/stats", protect, bookingController.getBookingStats);

export default router;
