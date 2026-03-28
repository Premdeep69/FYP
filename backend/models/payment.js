import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeCustomerId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true, // Amount in cents
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "canceled", "refunded"],
      default: "pending",
    },
    paymentType: {
      type: String,
      enum: ["session", "subscription", "one-time"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      sessionDate: Date,
      sessionDuration: Number,
      subscriptionPlan: String,
      refundReason: String,
      notes: String,
    },
    stripeWebhookData: {
      type: mongoose.Schema.Types.Mixed,
    },
    refundedAt: Date,
    refundAmount: Number,
    refundId: String,
    refundReason: String,
    // Invoice fields
    invoiceUrl: String,
    invoiceNumber: String,
    invoiceGeneratedAt: Date,
    paymentMethod: String,
  },
  { timestamps: true }
);

// Index for efficient queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ trainerId: 1, status: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ invoiceNumber: 1 });

export default mongoose.model("Payment", paymentSchema);