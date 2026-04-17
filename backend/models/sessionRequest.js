import mongoose from "mongoose";

const sessionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["personal-training", "group-class", "consultation", "follow-up"],
      required: true,
    },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true }, // HH:MM
    duration: { type: Number, default: 60 },         // minutes
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "offline",
    },
    location: {
      type: String,
      trim: true,
    },
    message: { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending", "awaiting_payment", "confirmed", "rejected", "expired", "payment_failed"],
      default: "pending",
    },

    // Set by trainer on accept
    agreedPrice: { type: Number },
    trainerNote: { type: String },

    // Payment tracking
    stripePaymentIntentId: { type: String },
    stripeClientSecret: { type: String },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    // Payment deadline (24h after acceptance)
    paymentDeadline: { type: Date },

    // Created slot after confirmed payment
    createdSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SessionSlot",
    },
    // Created booking after confirmed payment
    createdBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
  },
  { timestamps: true }
);

sessionRequestSchema.index({ trainerId: 1, status: 1 });
sessionRequestSchema.index({ userId: 1, status: 1 });
sessionRequestSchema.index({ paymentDeadline: 1, status: 1 }); // for expiry job

export default mongoose.model("SessionRequest", sessionRequestSchema);
