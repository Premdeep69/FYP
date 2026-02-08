import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema(
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
        "strength",
        "cardio",
        "flexibility",
        "balance",
        "plyometric",
        "core",
        "functional",
        "rehabilitation"
      ],
    },
    muscleGroups: [{
      type: String,
      enum: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "forearms",
        "abs",
        "obliques",
        "quadriceps",
        "hamstrings",
        "glutes",
        "calves",
        "traps",
        "lats",
        "delts",
        "core",
        "full-body"
      ],
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
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    instructions: [{
      step: Number,
      description: String,
    }],
    tips: [String],
    warnings: [String],
    images: [{
      url: String,
      caption: String,
      isMain: { type: Boolean, default: false },
    }],
    videos: [{
      url: String,
      title: String,
      duration: Number, // in seconds
    }],
    metrics: {
      defaultSets: { type: Number, default: 3 },
      defaultReps: { type: Number, default: 10 },
      defaultDuration: Number, // in seconds for time-based exercises
      defaultWeight: Number, // in kg
      defaultDistance: Number, // in meters
      restTime: { type: Number, default: 60 }, // in seconds
    },
    calories: {
      perMinute: Number,
      perRep: Number,
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  },
  { timestamps: true }
);

// Indexes for better query performance
exerciseSchema.index({ category: 1, difficulty: 1 });
exerciseSchema.index({ muscleGroups: 1 });
exerciseSchema.index({ equipment: 1 });
exerciseSchema.index({ name: "text", description: "text", tags: "text" });

export default mongoose.model("Exercise", exerciseSchema);