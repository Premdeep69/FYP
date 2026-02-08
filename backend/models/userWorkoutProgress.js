import mongoose from "mongoose";

const userWorkoutProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutPlan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "paused", "abandoned"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: Date,
    currentWeek: {
      type: Number,
      default: 1,
    },
    currentDay: {
      type: Number,
      default: 1,
    },
    completedWorkouts: [{
      workoutIndex: Number, // Index in the workout plan
      completedAt: { type: Date, default: Date.now },
      duration: Number, // actual duration in minutes
      caloriesBurned: Number,
      exercises: [{
        exerciseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exercise",
        },
        completedSets: [{
          reps: Number,
          weight: Number,
          duration: Number,
          distance: Number,
          restTime: Number,
          notes: String,
          completedAt: { type: Date, default: Date.now },
        }],
        skipped: { type: Boolean, default: false },
        skipReason: String,
        personalBest: {
          weight: Number,
          reps: Number,
          duration: Number,
          distance: Number,
          achievedAt: Date,
        },
      }],
      notes: String,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
    }],
    personalRecords: [{
      exerciseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
      recordType: {
        type: String,
        enum: ["max-weight", "max-reps", "max-duration", "max-distance"],
      },
      value: Number,
      unit: String,
      achievedAt: { type: Date, default: Date.now },
      workoutIndex: Number,
    }],
    statistics: {
      totalWorkouts: { type: Number, default: 0 },
      totalDuration: { type: Number, default: 0 }, // in minutes
      totalCalories: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 }, // percentage
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
    },
    preferences: {
      reminderTime: String, // e.g., "09:00"
      reminderDays: [Number], // 0-6 (Sunday-Saturday)
      autoProgressWeeks: { type: Boolean, default: true },
      trackPersonalRecords: { type: Boolean, default: true },
    },
    modifications: [{
      exerciseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
      originalExerciseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
      reason: String,
      modifiedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

// Indexes for better query performance
userWorkoutProgressSchema.index({ userId: 1, status: 1 });
userWorkoutProgressSchema.index({ workoutPlanId: 1 });
userWorkoutProgressSchema.index({ userId: 1, workoutPlanId: 1 }, { unique: true });

export default mongoose.model("UserWorkoutProgress", userWorkoutProgressSchema);