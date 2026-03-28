import express from "express";
import sessionSlotController from "../controllers/sessionSlotController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Protected routes - Trainer management (must come before :slotId routes)
router.post("/", protect, sessionSlotController.createSlot);
router.get("/trainer/my-slots", protect, sessionSlotController.getTrainerSlots);
router.get("/trainer/statistics", protect, sessionSlotController.getSlotStatistics);

// Public routes
router.get("/", sessionSlotController.getAllSlots);
router.get("/:slotId", sessionSlotController.getSlotById);

// Protected routes - User booking
router.post("/:slotId/book", protect, sessionSlotController.bookSlot);
router.get("/:slotId/meeting-info", protect, sessionSlotController.getMeetingInfo);

// Protected routes - Slot management
router.put("/:slotId", protect, sessionSlotController.updateSlot);
router.post("/:slotId/cancel", protect, sessionSlotController.cancelSlot);
router.delete("/:slotId", protect, sessionSlotController.deleteSlot);
router.post("/:slotId/duplicate", protect, sessionSlotController.duplicateSlot);
router.post("/:slotId/regenerate-room", protect, sessionSlotController.regenerateVideoCallRoom);

export default router;
