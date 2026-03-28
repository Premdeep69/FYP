import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ["user", "trainer", "admin"],
      default: "user",
    },
    trainerVerification: {
      status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
      documents: [{
        name: String,
        type: String,   // mime type
        size: Number,   // bytes
        data: String,   // base64 data URL
        uploadedAt: { type: Date, default: Date.now },
      }],
      submittedAt: Date,
      reviewedAt: Date,
      reviewNotes: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profile: {
      avatar: String,
      bio: String,
      age: Number,
      height: Number, // in cm
      weight: Number, // in kg
      fitnessLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "beginner",
      },
      goals: [String], // fitness goals
      preferences: {
        workoutTypes: [String],
        availableHours: [String],
        notifications: {
          workoutReminders: { type: Boolean, default: true },
          progressUpdates: { type: Boolean, default: true },
          sessionReminders: { type: Boolean, default: true },
        },
      },
    },
    // Trainer-specific fields
    trainerProfile: {
      specializations: [String],
      certifications: [String],
      experience: Number, // years
      hourlyRate: Number,
      sessionTypes: [{
        type: {
          type: String,
          enum: ["personal-training", "group-class", "consultation", "follow-up"],
        },
        duration: Number, // minutes
        price: Number,
        description: String,
      }],
      availability: [{
        day: {
          type: String,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        },
        startTime: String, // HH:MM format
        endTime: String, // HH:MM format
        isAvailable: { type: Boolean, default: true },
      }],
      blockedSlots: [{
        date: Date,
        startTime: String,
        endTime: String,
        reason: String,
      }],
      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
      },
      totalSessions: { type: Number, default: 0 },
      completedSessions: { type: Number, default: 0 },
      bio: String,
      profileImage: String,
    },
    // Activity tracking
    stats: {
      totalWorkouts: { type: Number, default: 0 },
      totalMinutes: { type: Number, default: 0 },
      totalCalories: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastWorkout: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stripe integration
    stripeCustomerId: {
      type: String,
      sparse: true, // Allow multiple null values
    },
    defaultPaymentMethodId: {
      type: String,
      sparse: true,
    },
    // Exercise favorites
    favoriteExercises: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
    }],
    // Exercise ratings
    exerciseRatings: [{
      exerciseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      ratedAt: Date,
    }],
    // FCM token for push notifications
    fcmToken: {
      type: String,
      sparse: true,
    },
    // Notification preferences
    preferences: {
      workoutReminders: { type: Boolean, default: true },
      progressUpdates: { type: Boolean, default: true },
      sessionReminders: { type: Boolean, default: true },
      messageNotifications: { type: Boolean, default: true },
      achievementNotifications: { type: Boolean, default: true },
      reminderTime: { type: String, default: '09:00' }, // HH:MM format
      reminderDays: [{ type: Number, min: 0, max: 6 }], // 0-6 (Sunday-Saturday)
    },
  },
  { timestamps: true }
);

// ALL HOOKS COMPLETELY REMOVED FOR DEBUGGING
// Synchronization handled entirely by syncService events from controllers

export default mongoose.model("User", userSchema);
