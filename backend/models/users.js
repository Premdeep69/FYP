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
      enum: ["user", "trainer"],
      default: "user",
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
      availability: [{
        day: String,
        startTime: String,
        endTime: String,
      }],
      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
      },
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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
