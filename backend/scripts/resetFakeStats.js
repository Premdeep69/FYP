/**
 * resetFakeStats.js
 * 
 * Run once to reset workout plan and exercise stats that were seeded with fake values.
 * Recomputes totalEnrollments from real UserWorkoutProgress records.
 * Resets averageRating and totalRatings to 0 for plans/exercises with no real ratings.
 * 
 * Usage: node backend/scripts/resetFakeStats.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import WorkoutPlan from "../models/workoutPlan.js";
import UserWorkoutProgress from "../models/userWorkoutProgress.js";
import Exercise from "../models/exercise.js";
import User from "../models/users.js";
import Session from "../models/session.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected:", process.env.MONGO_URI);

  // ── Reset WorkoutPlan stats ──────────────────────────────────────────────
  console.log("\n── Workout Plans ──");
  const plans = await WorkoutPlan.find({});
  console.log(`Found ${plans.length} workout plans`);

  let plansUpdated = 0;
  for (const plan of plans) {
    const realEnrollments = await UserWorkoutProgress.countDocuments({ workoutPlanId: plan._id });

    const progressWithRatings = await UserWorkoutProgress.find({
      workoutPlanId: plan._id,
      "completedWorkouts.rating": { $exists: true, $gt: 0 },
    });

    let ratingSum = 0, ratingCount = 0;
    for (const p of progressWithRatings) {
      for (const w of p.completedWorkouts) {
        if (w.rating && w.rating > 0) { ratingSum += w.rating; ratingCount++; }
      }
    }
    const realAvgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    if (plan.totalEnrollments !== realEnrollments || plan.averageRating !== realAvgRating || plan.totalRatings !== ratingCount) {
      await WorkoutPlan.findByIdAndUpdate(plan._id, {
        totalEnrollments: realEnrollments,
        averageRating: realAvgRating,
        totalRatings: ratingCount,
      });
      console.log(`  Updated "${plan.name}": enrollments ${plan.totalEnrollments}→${realEnrollments}, rating ${plan.averageRating}→${realAvgRating} (${ratingCount} ratings)`);
      plansUpdated++;
    }
  }
  console.log(`Plans updated: ${plansUpdated}/${plans.length}`);

  // ── Reset Exercise stats ─────────────────────────────────────────────────
  console.log("\n── Exercises ──");
  const exercises = await Exercise.find({});
  console.log(`Found ${exercises.length} exercises`);

  let exercisesUpdated = 0;
  for (const exercise of exercises) {
    // Compute real rating from user exerciseRatings arrays
    const usersWithRating = await User.find({
      "exerciseRatings.exerciseId": exercise._id,
    }).select("exerciseRatings");

    let ratingSum = 0, ratingCount = 0;
    for (const u of usersWithRating) {
      const r = u.exerciseRatings?.find(
        (er) => er.exerciseId.toString() === exercise._id.toString()
      );
      if (r?.rating > 0) { ratingSum += r.rating; ratingCount++; }
    }
    const realAvgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    if (exercise.averageRating !== realAvgRating || exercise.totalRatings !== ratingCount) {
      await Exercise.findByIdAndUpdate(exercise._id, {
        averageRating: realAvgRating,
        totalRatings: ratingCount,
      });
      console.log(`  Updated "${exercise.name}": rating ${exercise.averageRating}→${realAvgRating} (${ratingCount} ratings)`);
      exercisesUpdated++;
    }
  }
  console.log(`Exercises updated: ${exercisesUpdated}/${exercises.length}`);

  // ── Reset Trainer ratings ──────────────────────────────────────────────────
  console.log("\n── Trainers ──");
  const trainers = await User.find({ userType: "trainer" }).select("_id name trainerProfile");
  console.log(`Found ${trainers.length} trainers`);

  let trainersUpdated = 0;
  for (const trainer of trainers) {
    const ratedSessions = await Session.find({
      trainerId: trainer._id,
      status: "completed",
      "feedback.rating": { $exists: true, $gt: 0 },
    }).select("feedback.rating");

    const count = ratedSessions.length;
    const sum = ratedSessions.reduce((s, sess) => s + (sess.feedback?.rating || 0), 0);
    const realAvg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    const current = trainer.trainerProfile?.rating;
    if (current?.average !== realAvg || current?.count !== count) {
      await User.findByIdAndUpdate(trainer._id, {
        "trainerProfile.rating.average": realAvg,
        "trainerProfile.rating.count": count,
      });
      console.log(`  Updated "${trainer.name}": rating ${current?.average ?? 0}→${realAvg} (${count} ratings)`);
      trainersUpdated++;
    }
  }
  console.log(`Trainers updated: ${trainersUpdated}/${trainers.length}`);

  console.log("\n✅ Done.");
  await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
