import express from "express";
import User from "../models/users.js";
import Workout from "../models/workout.js";
import Session from "../models/session.js";
import Goal from "../models/goal.js";
import Exercise from "../models/exercise.js";
import WorkoutPlan from "../models/workoutPlan.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Seed sample data for testing
router.post("/sample-data", async (req, res) => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Workout.deleteMany({});
    await Session.deleteMany({});
    await Goal.deleteMany({});
    await Exercise.deleteMany({});
    await WorkoutPlan.deleteMany({});

    // Create sample users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    const sampleUser = await User.create({
      name: "John Doe",
      email: "user@example.com",
      password: hashedPassword,
      userType: "user",
      stats: {
        totalWorkouts: 15,
        totalMinutes: 450,
        totalCalories: 3500,
        currentStreak: 5,
        longestStreak: 12,
        lastWorkout: new Date()
      }
    });

    const sampleTrainer = await User.create({
      name: "Sarah Johnson",
      email: "trainer@example.com",
      password: hashedPassword,
      userType: "trainer",
      trainerProfile: {
        specializations: ["Weight Loss", "Strength Training", "HIIT"],
        certifications: ["NASM-CPT", "ACSM"],
        experience: 5,
        hourlyRate: 75,
        rating: {
          average: 4.8,
          count: 24
        }
      }
    });

    // Create sample workouts for the user
    const workouts = [
      {
        userId: sampleUser._id,
        name: "Morning HIIT",
        type: "hiit",
        duration: 30,
        caloriesBurned: 350,
        exercises: [
          { name: "Burpees", sets: 3, reps: 10 },
          { name: "Jump Squats", sets: 3, reps: 15 },
          { name: "Mountain Climbers", duration: 60 }
        ],
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        userId: sampleUser._id,
        name: "Strength Training",
        type: "strength",
        duration: 45,
        caloriesBurned: 280,
        exercises: [
          { name: "Bench Press", sets: 3, reps: 8, weight: 70 },
          { name: "Squats", sets: 3, reps: 10, weight: 80 },
          { name: "Deadlifts", sets: 3, reps: 6, weight: 100 }
        ],
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        userId: sampleUser._id,
        name: "Cardio Session",
        type: "cardio",
        duration: 40,
        caloriesBurned: 400,
        exercises: [
          { name: "Treadmill", duration: 20 },
          { name: "Cycling", duration: 20 }
        ],
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    ];

    await Workout.insertMany(workouts);

    // Create sample goals for the user
    const goals = [
      {
        userId: sampleUser._id,
        type: "workout-sessions",
        title: "Workout Sessions",
        targetValue: 6,
        currentValue: 4,
        unit: "sessions",
        period: "weekly",
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        userId: sampleUser._id,
        type: "active-minutes",
        title: "Active Minutes",
        targetValue: 300,
        currentValue: 240,
        unit: "minutes",
        period: "weekly",
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        userId: sampleUser._id,
        type: "calories-burned",
        title: "Calories Burned",
        targetValue: 2000,
        currentValue: 1500,
        unit: "calories",
        period: "weekly",
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ];

    await Goal.insertMany(goals);

    // Create sample sessions for the trainer
    const sessions = [
      {
        trainerId: sampleTrainer._id,
        clientId: sampleUser._id,
        sessionType: "personal-training",
        scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        duration: 60,
        status: "confirmed",
        price: 75
      },
      {
        trainerId: sampleTrainer._id,
        clientId: sampleUser._id,
        sessionType: "group-class",
        scheduledDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        duration: 45,
        status: "scheduled",
        price: 50
      }
    ];

    await Session.insertMany(sessions);

    // Create sample exercises
    const exercises = [
      {
        name: "Push-ups",
        description: "A fundamental upper body exercise that targets chest, shoulders, and triceps.",
        category: "strength",
        muscleGroups: ["chest", "shoulders", "triceps"],
        equipment: ["none"],
        difficulty: "beginner",
        videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
        instructions: [
          { step: 1, description: "Start in a plank position with hands slightly wider than shoulder-width" },
          { step: 2, description: "Keep your body in a straight line from head to heels" },
          { step: 3, description: "Lower your body until chest nearly touches the floor" },
          { step: 4, description: "Push back up to starting position" },
          { step: 5, description: "Repeat for desired repetitions" }
        ],
        tips: ["Keep core engaged", "Don't let hips sag", "Control the movement"],
        metrics: {
          defaultSets: 3,
          defaultReps: 10,
          restTime: 60
        },
        calories: { perRep: 0.5 },
        createdBy: sampleTrainer._id,
        popularity: 95,
        averageRating: 4.5,
        totalRatings: 120
      },
      {
        name: "Squats",
        description: "The king of leg exercises, working quads, hamstrings, and glutes.",
        category: "strength",
        muscleGroups: ["quadriceps", "hamstrings", "glutes"],
        equipment: ["none"],
        difficulty: "beginner",
        videoUrl: "https://www.youtube.com/watch?v=aclHkVaku9U",
        instructions: [
          { step: 1, description: "Stand with feet shoulder-width apart" },
          { step: 2, description: "Keep chest up and core engaged" },
          { step: 3, description: "Lower down as if sitting in a chair" },
          { step: 4, description: "Keep knees in line with toes" },
          { step: 5, description: "Push through heels to return to standing" }
        ],
        tips: ["Keep weight on heels", "Don't let knees cave in", "Go as low as comfortable"],
        metrics: {
          defaultSets: 3,
          defaultReps: 12,
          restTime: 60
        },
        calories: { perRep: 0.7 },
        createdBy: sampleTrainer._id,
        popularity: 88,
        averageRating: 4.3,
        totalRatings: 95
      },
      {
        name: "Deadlifts",
        description: "A compound movement that builds overall strength and muscle mass.",
        category: "strength",
        muscleGroups: ["hamstrings", "glutes", "back", "traps"],
        equipment: ["barbell"],
        difficulty: "advanced",
        videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q",
        instructions: [
          { step: 1, description: "Stand with feet hip-width apart, bar over mid-foot" },
          { step: 2, description: "Bend down and grip the bar just outside your legs" },
          { step: 3, description: "Keep back straight, chest up, shoulders back" },
          { step: 4, description: "Drive through heels to stand up with the weight" },
          { step: 5, description: "Lower the bar with control back to the floor" }
        ],
        tips: ["Keep bar close to body", "Engage lats", "Don't round back"],
        warnings: ["Use proper form to avoid injury", "Start with light weight"],
        metrics: {
          defaultSets: 3,
          defaultReps: 5,
          defaultWeight: 60,
          restTime: 120
        },
        calories: { perRep: 1.2 },
        createdBy: sampleTrainer._id,
        popularity: 75,
        averageRating: 4.7,
        totalRatings: 68
      },
      {
        name: "Plank",
        description: "A foundational core exercise that builds stability and endurance.",
        category: "core",
        muscleGroups: ["abs", "core"],
        equipment: ["none"],
        difficulty: "beginner",
        videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
        instructions: [
          { step: 1, description: "Start in forearm plank position" },
          { step: 2, description: "Keep body in straight line from head to heels" },
          { step: 3, description: "Engage core and glutes" },
          { step: 4, description: "Don't let hips sag or pike up" },
          { step: 5, description: "Hold for desired time" }
        ],
        tips: ["Breathe normally", "Focus on form over time", "Keep shoulders over elbows"],
        metrics: {
          defaultSets: 3,
          defaultDuration: 30,
          restTime: 30
        },
        calories: { perMinute: 3 },
        createdBy: sampleTrainer._id,
        popularity: 82,
        averageRating: 4.2,
        totalRatings: 156
      },
      {
        name: "Burpees",
        description: "A full-body exercise that combines strength and cardio.",
        category: "plyometric",
        muscleGroups: ["full-body"],
        equipment: ["none"],
        difficulty: "intermediate",
        videoUrl: "https://www.youtube.com/watch?v=TU8QYVW0gDU",
        instructions: [
          { step: 1, description: "Start standing with feet shoulder-width apart" },
          { step: 2, description: "Drop into a squat and place hands on floor" },
          { step: 3, description: "Jump feet back into plank position" },
          { step: 4, description: "Do a push-up (optional)" },
          { step: 5, description: "Jump feet back to squat, then jump up with arms overhead" }
        ],
        tips: ["Land softly", "Keep core engaged", "Modify as needed"],
        metrics: {
          defaultSets: 3,
          defaultReps: 8,
          restTime: 90
        },
        calories: { perRep: 1.5 },
        createdBy: sampleTrainer._id,
        popularity: 65,
        averageRating: 3.9,
        totalRatings: 89
      },
      {
        name: "Mountain Climbers",
        description: "A dynamic cardio exercise that targets core and improves agility.",
        category: "cardio",
        muscleGroups: ["core", "shoulders"],
        equipment: ["none"],
        difficulty: "intermediate",
        videoUrl: "https://www.youtube.com/watch?v=nmwgirgXLYM",
        instructions: [
          { step: 1, description: "Start in plank position" },
          { step: 2, description: "Bring right knee toward chest" },
          { step: 3, description: "Quickly switch legs, bringing left knee to chest" },
          { step: 4, description: "Continue alternating legs rapidly" },
          { step: 5, description: "Keep hips level and core engaged" }
        ],
        tips: ["Keep shoulders over hands", "Land on balls of feet", "Maintain plank position"],
        metrics: {
          defaultSets: 3,
          defaultDuration: 30,
          restTime: 60
        },
        calories: { perMinute: 8 },
        createdBy: sampleTrainer._id,
        popularity: 70,
        averageRating: 4.1,
        totalRatings: 73
      }
    ];

    const createdExercises = await Exercise.insertMany(exercises);

    // Create sample workout plans
    const workoutPlans = [
      {
        name: "Beginner Full Body",
        description: "Perfect for beginners looking to build a foundation of strength and fitness",
        category: "general-fitness",
        difficulty: "beginner",
        duration: {
          weeks: 8,
          daysPerWeek: 3,
          minutesPerSession: 45
        },
        goals: ["general-fitness", "build-muscle"],
        targetAudience: {
          gender: "all",
          ageRange: { min: 18, max: 65 },
          fitnessLevel: ["beginner"]
        },
        workouts: [
          {
            day: 1,
            week: 1,
            name: "Full Body Workout A",
            description: "Upper and lower body strength training",
            exercises: [
              {
                exerciseId: createdExercises[0]._id, // Push-ups
                sets: 3,
                reps: 8,
                restTime: 60
              },
              {
                exerciseId: createdExercises[1]._id, // Squats
                sets: 3,
                reps: 10,
                restTime: 60
              },
              {
                exerciseId: createdExercises[3]._id, // Plank
                sets: 3,
                duration: 20,
                restTime: 30
              }
            ],
            estimatedDuration: 45,
            estimatedCalories: 250
          },
          {
            day: 3,
            week: 1,
            name: "Full Body Workout B",
            description: "Cardio and strength combination",
            exercises: [
              {
                exerciseId: createdExercises[4]._id, // Burpees
                sets: 3,
                reps: 5,
                restTime: 90
              },
              {
                exerciseId: createdExercises[5]._id, // Mountain Climbers
                sets: 3,
                duration: 20,
                restTime: 60
              },
              {
                exerciseId: createdExercises[1]._id, // Squats
                sets: 3,
                reps: 12,
                restTime: 60
              }
            ],
            estimatedDuration: 40,
            estimatedCalories: 300
          }
        ],
        equipment: ["none"],
        tags: ["beginner", "full-body", "no-equipment"],
        createdBy: sampleTrainer._id,
        popularity: 85,
        averageRating: 4.4,
        totalRatings: 67,
        totalEnrollments: 234
      },
      {
        name: "Strength Builder",
        description: "Intermediate program focused on building strength and muscle mass",
        category: "strength",
        difficulty: "intermediate",
        duration: {
          weeks: 12,
          daysPerWeek: 4,
          minutesPerSession: 60
        },
        goals: ["build-muscle", "increase-strength"],
        targetAudience: {
          gender: "all",
          ageRange: { min: 18, max: 50 },
          fitnessLevel: ["intermediate"]
        },
        workouts: [
          {
            day: 1,
            week: 1,
            name: "Upper Body Strength",
            description: "Focus on chest, shoulders, and arms",
            exercises: [
              {
                exerciseId: createdExercises[0]._id, // Push-ups
                sets: 4,
                reps: 12,
                restTime: 90
              },
              {
                exerciseId: createdExercises[2]._id, // Deadlifts
                sets: 4,
                reps: 6,
                weight: 40,
                restTime: 120
              }
            ],
            estimatedDuration: 60,
            estimatedCalories: 350
          },
          {
            day: 3,
            week: 1,
            name: "Lower Body Power",
            description: "Leg and glute focused workout",
            exercises: [
              {
                exerciseId: createdExercises[1]._id, // Squats
                sets: 4,
                reps: 15,
                restTime: 90
              },
              {
                exerciseId: createdExercises[2]._id, // Deadlifts
                sets: 4,
                reps: 8,
                weight: 50,
                restTime: 120
              }
            ],
            estimatedDuration: 55,
            estimatedCalories: 380
          }
        ],
        equipment: ["barbell", "dumbbells"],
        tags: ["strength", "muscle-building", "intermediate"],
        isPremium: true,
        createdBy: sampleTrainer._id,
        popularity: 72,
        averageRating: 4.6,
        totalRatings: 45,
        totalEnrollments: 156
      },
      {
        name: "Fat Loss HIIT",
        description: "High-intensity interval training for maximum fat burn",
        category: "weight-loss",
        difficulty: "intermediate",
        duration: {
          weeks: 6,
          daysPerWeek: 4,
          minutesPerSession: 30
        },
        goals: ["lose-weight", "improve-endurance"],
        targetAudience: {
          gender: "all",
          ageRange: { min: 20, max: 45 },
          fitnessLevel: ["intermediate", "advanced"]
        },
        workouts: [
          {
            day: 1,
            week: 1,
            name: "HIIT Circuit A",
            description: "High-intensity full body circuit",
            exercises: [
              {
                exerciseId: createdExercises[4]._id, // Burpees
                sets: 4,
                reps: 10,
                restTime: 30
              },
              {
                exerciseId: createdExercises[5]._id, // Mountain Climbers
                sets: 4,
                duration: 30,
                restTime: 30
              },
              {
                exerciseId: createdExercises[1]._id, // Squats
                sets: 4,
                reps: 20,
                restTime: 30
              }
            ],
            estimatedDuration: 30,
            estimatedCalories: 400
          }
        ],
        equipment: ["none"],
        tags: ["hiit", "fat-loss", "cardio", "no-equipment"],
        createdBy: sampleTrainer._id,
        popularity: 91,
        averageRating: 4.3,
        totalRatings: 89,
        totalEnrollments: 312
      }
    ];

    await WorkoutPlan.insertMany(workoutPlans);

    res.json({ 
      message: "Sample data created successfully",
      users: { user: sampleUser.email, trainer: sampleTrainer.email },
      password: "password123",
      exercises: exercises.length,
      workoutPlans: workoutPlans.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;