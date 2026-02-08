import mongoose from "mongoose";

const workoutPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "weight-loss",
        "muscle-gain",
        "strength",
        "endurance",
        "flexibility",
        "general-fitness",
        "rehabilitation",
        "sports-specific"
      ],
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    duration: {
      weeks: { type: Number, required: true },
      daysPerWeek: { type: Number, required: true },
      minutesPerSession: { type: Number, required: true },
    },
    goals: [{
      type: String,
      enum: [
        "lose-weight",
        "build-muscle",
        "increase-strength",
        "improve-endurance",
        "enhance-flexibility",
        "general-fitness",
        "sport-performance",
        "rehabilitation"
      ],
    }],
    targetAudience: {
      gender: {
        type: String,
        enum: ["male", "female", "all"],
        default: "all",
      },
      ageRange: {
        min: { type: Number, default: 18 },
        max: { type: Number, default: 65 },
      },
      fitnessLevel: [{
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      }],
    },
    workouts: [{
      day: {
        type: Number,
        required: true, // Day of the week (1-7)
      },
      week: {
        type: Number,
        required: true, // Week number in the plan
      },
      name: {
        type: String,
        required: true,
      },
      description: String,
      warmup: [{
        exerciseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exercise",
        },
        duration: Number, // in minutes
        notes: String,
      }],
      exercises: [{
        exerciseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exercise",
          required: true,
        },
        sets: { type: Number, required: true },
        reps: Number,
        duration: Number, // in seconds
        weight: Number, // in kg
        distance: Number, // in meters
        restTime: Number, // in seconds
        notes: String,
        isSuperset: { type: Boolean, default: false },
        supersetGroup: Number,
      }],
      cooldown: [{
        exerciseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exercise",
        },
        duration: Number, // in minutes
        notes: String,
      }],
      estimatedDuration: Number, // in minutes
      estimatedCalories: Number,
    }],
    equipment: [{
      type: String,
      enum: [
        "none",
        "dumbbells",
        "barbell",
        "kettlebell",
        "resistance-bands",
        "pull-up-bar",
        "bench",
        "cable-machine",
        "treadmill",
        "stationary-bike",
        "rowing-machine",
        "medicine-ball",
        "stability-ball",
        "foam-roller",
        "yoga-mat"
      ],
    }],
    images: [{
      url: String,
      caption: String,
      isMain: { type: Boolean, default: false },
    }],
    tags: [String],
    isPublic: {
      type: Boolean,
      default: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Analytics
    popularity: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    totalEnrollments: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
workoutPlanSchema.index({ category: 1, difficulty: 1 });
workoutPlanSchema.index({ "targetAudience.fitnessLevel": 1 });
workoutPlanSchema.index({ equipment: 1 });
workoutPlanSchema.index({ isPublic: 1, isPremium: 1 });
workoutPlanSchema.index({ name: "text", description: "text", tags: "text" });

export default mongoose.model("WorkoutPlan", workoutPlanSchema);