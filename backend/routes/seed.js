import express from "express";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Seed routes are disabled in production.
// In development, they require admin authentication to prevent accidental data loss.
router.post("/sample-data", protect, authorize("admin"), async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Seed routes are disabled in production." });
  }

  // Dynamic imports to avoid loading heavy modules in production
  const { default: User }        = await import("../models/users.js");
  const { default: Workout }     = await import("../models/workout.js");
  const { default: Session }     = await import("../models/session.js");
  const { default: Goal }        = await import("../models/goal.js");
  const { default: Exercise }    = await import("../models/exercise.js");
  const { default: WorkoutPlan } = await import("../models/workoutPlan.js");
  const { default: bcrypt }      = await import("bcryptjs");

  try {
    // Only seed if collections are empty — never overwrite real data
    const [userCount, exerciseCount, planCount] = await Promise.all([
      User.countDocuments({ userType: { $in: ["user", "trainer"] } }),
      Exercise.countDocuments(),
      WorkoutPlan.countDocuments(),
    ]);

    if (userCount > 0 || exerciseCount > 0 || planCount > 0) {
      return res.status(409).json({
        message: "Database already contains data. Seed aborted to protect existing records.",
        counts: { users: userCount, exercises: exerciseCount, workoutPlans: planCount },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    // Create demo user
    const demoUser = await User.create({
      name: "Demo User",
      email: "demo.user@smartgym.dev",
      password: hashedPassword,
      userType: "user",
      isActive: true,
      stats: { totalWorkouts: 0, totalMinutes: 0, totalCalories: 0, currentStreak: 0, longestStreak: 0 },
    });

    // Create demo trainer
    const demoTrainer = await User.create({
      name: "Demo Trainer",
      email: "demo.trainer@smartgym.dev",
      password: hashedPassword,
      userType: "trainer",
      isVerified: true,
      isActive: true,
      trainerVerification: { status: "verified", reviewedAt: new Date() },
      trainerProfile: {
        specializations: ["Strength Training", "Weight Loss"],
        certifications: ["NASM-CPT"],
        experience: 3,
        hourlyRate: 60,
        bio: "Demo trainer account for testing.",
        rating: { average: 0, count: 0 },
        totalSessions: 0,
        completedSessions: 0,
      },
    });

    // Seed a few exercises
    const exercises = await Exercise.insertMany([
      {
        name: "Push-ups",
        description: "A fundamental upper body exercise targeting chest, shoulders, and triceps.",
        category: "strength",
        muscleGroups: ["chest", "shoulders", "triceps"],
        equipment: ["none"],
        difficulty: "beginner",
        metrics: { defaultSets: 3, defaultReps: 10, restTime: 60 },
        createdBy: demoTrainer._id,
      },
      {
        name: "Bodyweight Squats",
        description: "A foundational lower body exercise targeting quads, hamstrings, and glutes.",
        category: "strength",
        muscleGroups: ["quadriceps", "hamstrings", "glutes"],
        equipment: ["none"],
        difficulty: "beginner",
        metrics: { defaultSets: 3, defaultReps: 12, restTime: 60 },
        createdBy: demoTrainer._id,
      },
      {
        name: "Plank",
        description: "A core stability exercise that builds endurance in the abs and back.",
        category: "core",
        muscleGroups: ["abs", "core"],
        equipment: ["none"],
        difficulty: "beginner",
        metrics: { defaultSets: 3, defaultDuration: 30, restTime: 30 },
        createdBy: demoTrainer._id,
      },
    ]);

    // Seed a starter workout plan
    await WorkoutPlan.create({
      name: "Starter Full Body",
      description: "A beginner-friendly 4-week full body program with no equipment required.",
      category: "general-fitness",
      difficulty: "beginner",
      duration: { weeks: 4, daysPerWeek: 3, minutesPerSession: 30 },
      goals: ["general-fitness"],
      equipment: ["none"],
      workouts: [
        {
          day: 1, week: 1,
          name: "Day 1 — Full Body",
          exercises: [
            { exerciseId: exercises[0]._id, sets: 3, reps: 10, restTime: 60 },
            { exerciseId: exercises[1]._id, sets: 3, reps: 12, restTime: 60 },
            { exerciseId: exercises[2]._id, sets: 3, duration: 20, restTime: 30 },
          ],
        },
      ],
      isPublic: true,
      createdBy: demoTrainer._id,
    });

    res.json({
      message: "Demo seed data created successfully.",
      note: "These are demo accounts only. Use real accounts for production.",
      accounts: {
        user: { email: demoUser.email, password: "password123" },
        trainer: { email: demoTrainer.email, password: "password123" },
      },
      seeded: { exercises: exercises.length, workoutPlans: 1 },
    });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
