import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["strength", "cardio", "hiit", "yoga", "flexibility", "other"],
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    caloriesBurned: {
      type: Number,
      default: 0,
    },
    exercises: [{
      name: String,
      sets: Number,
      reps: Number,
      weight: Number,
      duration: Number, // for time-based exercises
    }],
    notes: String,
    completedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["completed", "in-progress", "skipped"],
      default: "completed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Workout", workoutSchema);