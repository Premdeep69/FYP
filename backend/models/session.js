import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["personal-training", "group-class", "consultation", "follow-up"],
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // HH:MM format
      required: true,
    },
    endTime: {
      type: String, // HH:MM format
      required: true,
    },
    duration: {
      type: Number, // in minutes
      default: 60,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "no-show"],
      default: "pending",
    },
    price: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SessionSlot",
    },
    notes: String,
    clientNotes: String, // Notes from client when booking
    trainerNotes: String, // Notes from trainer
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledByRole: {
      type: String,
      enum: ["user", "trainer", "admin"],
    },
    cancelledAt: Date,
    refundPercentage: {
      type: Number, // 0–100
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      createdAt: Date,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
sessionSchema.index({ trainerId: 1, scheduledDate: 1 });
sessionSchema.index({ clientId: 1, status: 1 });
sessionSchema.index({ status: 1, scheduledDate: 1 });

// ALL HOOKS COMPLETELY REMOVED FOR DEBUGGING
// Synchronization handled entirely by syncService events from controllers

export default mongoose.model("Session", sessionSchema);