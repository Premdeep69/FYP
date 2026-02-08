import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["workout-sessions", "active-minutes", "calories-burned", "weight-loss", "weight-gain", "custom"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      required: true, // e.g., "sessions", "minutes", "calories", "kg", "lbs"
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      default: "weekly",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);