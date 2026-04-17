import WorkoutPlan from "../models/workoutPlan.js";
import UserWorkoutProgress from "../models/userWorkoutProgress.js";
import Exercise from "../models/exercise.js";
import User from "../models/users.js";

// Get all workout plans with filtering
export const getWorkoutPlans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      difficulty,
      duration,
      equipment,
      search,
      sortBy = "popularity",
      sortOrder = "desc",
      isPremium
    } = req.query;

    // Build filter object
    const filter = {};
    // Non-admin requests only see public plans
    if (req.query.isPublic !== undefined) {
      filter.isPublic = req.query.isPublic === 'true';
    } else if (!req.user || req.user.userType !== 'admin') {
      filter.isPublic = true;
    }
    
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (equipment) {
      const equipmentList = Array.isArray(equipment) ? equipment : [equipment];
      filter.equipment = { $in: equipmentList };
    }
    if (isPremium !== undefined) filter.isPremium = isPremium === 'true';
    if (search) {
      filter.$text = { $search: search };
    }
    if (duration) {
      const [min, max] = duration.split('-').map(Number);
      filter['duration.weeks'] = { $gte: min, $lte: max || min };
    }

    // Build sort object
    const sortOptions = {};
    if (sortBy === "popularity") sortOptions.popularity = sortOrder === "desc" ? -1 : 1;
    else if (sortBy === "rating") sortOptions.averageRating = sortOrder === "desc" ? -1 : 1;
    else if (sortBy === "name") sortOptions.name = sortOrder === "desc" ? -1 : 1;
    else if (sortBy === "created") sortOptions.createdAt = sortOrder === "desc" ? -1 : 1;

    const workoutPlans = await WorkoutPlan.find(filter)
      .populate("createdBy", "name email userType trainerProfile")
      .populate("workouts.exercises.exerciseId", "name category muscleGroups")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WorkoutPlan.countDocuments(filter);

    res.json({
      workoutPlans,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single workout plan by ID
export const getWorkoutPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workoutPlan = await WorkoutPlan.findById(id)
      .populate("createdBy", "name email userType trainerProfile")
      .populate({
        path: "workouts.exercises.exerciseId",
        select: "name description category muscleGroups equipment difficulty instructions images"
      })
      .populate({
        path: "workouts.warmup.exerciseId",
        select: "name description category"
      })
      .populate({
        path: "workouts.cooldown.exerciseId",
        select: "name description category"
      });

    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found" });
    }

    // Increment popularity
    await WorkoutPlan.findByIdAndUpdate(id, { $inc: { popularity: 1 } });

    // Check if user is enrolled (if authenticated)
    let userProgress = null;
    if (req.user) {
      userProgress = await UserWorkoutProgress.findOne({
        userId: req.user._id,
        workoutPlanId: id
      });
    }

    res.json({
      workoutPlan,
      userProgress,
      isEnrolled: !!userProgress,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new workout plan (trainers only)
export const createWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const workoutPlanData = {
      ...req.body,
      createdBy: userId,
    };

    // Validate exercises exist
    const exerciseIds = [];
    workoutPlanData.workouts?.forEach(workout => {
      workout.exercises?.forEach(ex => exerciseIds.push(ex.exerciseId));
      workout.warmup?.forEach(ex => exerciseIds.push(ex.exerciseId));
      workout.cooldown?.forEach(ex => exerciseIds.push(ex.exerciseId));
    });

    const existingExercises = await Exercise.find({
      _id: { $in: exerciseIds },
      isActive: true
    });

    if (existingExercises.length !== exerciseIds.length) {
      return res.status(400).json({ message: "Some exercises not found or inactive" });
    }

    const workoutPlan = await WorkoutPlan.create(workoutPlanData);
    await workoutPlan.populate("createdBy", "name email userType");

    res.status(201).json({
      message: "Workout plan created successfully",
      workoutPlan,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update workout plan (creator only)
export const updateWorkoutPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const workoutPlan = await WorkoutPlan.findById(id);
    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found" });
    }

    // Check if user is the creator or admin
    if (workoutPlan.createdBy.toString() !== userId.toString() && req.user.userType !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this workout plan" });
    }

    const updatedWorkoutPlan = await WorkoutPlan.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate("createdBy", "name email userType");

    res.json({
      message: "Workout plan updated successfully",
      workoutPlan: updatedWorkoutPlan,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete workout plan (creator only)
export const deleteWorkoutPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const workoutPlan = await WorkoutPlan.findById(id);
    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found" });
    }

    // Check if user is the creator or admin
    if (workoutPlan.createdBy.toString() !== userId.toString() && req.user.userType !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this workout plan" });
    }

    await WorkoutPlan.findByIdAndDelete(id);

    res.json({ message: "Workout plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Enroll in workout plan
export const enrollInWorkoutPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const workoutPlan = await WorkoutPlan.findById(id);
    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found" });
    }

    // Check if already enrolled
    const existingProgress = await UserWorkoutProgress.findOne({
      userId,
      workoutPlanId: id
    });

    if (existingProgress) {
      return res.status(400).json({ message: "Already enrolled in this workout plan" });
    }

    // Create progress record
    const progress = await UserWorkoutProgress.create({
      userId,
      workoutPlanId: id,
      status: "active",
    });

    // Increment enrollment count
    await WorkoutPlan.findByIdAndUpdate(id, { $inc: { totalEnrollments: 1 } });

    res.status(201).json({
      message: "Successfully enrolled in workout plan",
      progress,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's workout plans
export const getUserWorkoutPlans = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const userProgress = await UserWorkoutProgress.find(filter)
      .populate({
        path: "workoutPlanId",
        populate: [
          {
            path: "createdBy",
            select: "name email userType"
          },
          {
            path: "workouts.exercises.exerciseId",
            select: "name category muscleGroups difficulty equipment"
          }
        ]
      })
      .sort({ createdAt: -1 });

    res.json(userProgress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Log workout completion
export const logWorkoutCompletion = async (req, res) => {
  try {
    const { progressId } = req.params;
    const { workoutIndex, duration, caloriesBurned, exercises, rating, feedback, notes } = req.body;
    const userId = req.user._id;

    const progress = await UserWorkoutProgress.findOne({
      _id: progressId,
      userId
    });

    if (!progress) {
      return res.status(404).json({ message: "Workout progress not found" });
    }

    // Add completed workout
    const completedWorkout = {
      workoutIndex,
      duration,
      caloriesBurned,
      exercises,
      rating,
      feedback,
      notes,
      completedAt: new Date(),
    };

    progress.completedWorkouts.push(completedWorkout);

    // Update statistics
    progress.statistics.totalWorkouts += 1;
    progress.statistics.totalDuration += duration;
    progress.statistics.totalCalories += caloriesBurned;
    
    if (rating) {
      const totalRatedWorkouts = progress.completedWorkouts.filter(w => w.rating).length;
      const totalRating = progress.completedWorkouts.reduce((sum, w) => sum + (w.rating || 0), 0);
      progress.statistics.averageRating = totalRating / totalRatedWorkouts;
    }

    // Update completion rate
    const workoutPlan = await WorkoutPlan.findById(progress.workoutPlanId);
    const totalWorkoutsInPlan = workoutPlan.workouts.length;
    progress.statistics.completionRate = (progress.completedWorkouts.length / totalWorkoutsInPlan) * 100;

    // Check for personal records
    exercises?.forEach(exercise => {
      exercise.completedSets?.forEach(set => {
        const existingRecord = progress.personalRecords.find(
          record => record.exerciseId.toString() === exercise.exerciseId.toString()
        );

        // Check for weight PR
        if (set.weight && (!existingRecord || set.weight > existingRecord.value)) {
          progress.personalRecords.push({
            exerciseId: exercise.exerciseId,
            recordType: "max-weight",
            value: set.weight,
            unit: "kg",
            workoutIndex,
          });
        }

        // Check for reps PR
        if (set.reps && (!existingRecord || set.reps > existingRecord.value)) {
          progress.personalRecords.push({
            exerciseId: exercise.exerciseId,
            recordType: "max-reps",
            value: set.reps,
            unit: "reps",
            workoutIndex,
          });
        }
      });
    });

    await progress.save();

    // Update user's overall stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'stats.totalWorkouts': 1,
        'stats.totalMinutes': duration,
        'stats.totalCalories': caloriesBurned
      },
      'stats.lastWorkout': new Date()
    });

    res.json({
      message: "Workout logged successfully",
      progress,
      personalRecords: progress.personalRecords.slice(-5), // Return latest 5 PRs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get workout plan filters
export const getWorkoutPlanFilters = async (req, res) => {
  try {
    const categories = await WorkoutPlan.distinct("category", { isPublic: true });
    const difficulties = await WorkoutPlan.distinct("difficulty", { isPublic: true });
    const equipment = await WorkoutPlan.distinct("equipment", { isPublic: true });
    const goals = await WorkoutPlan.distinct("goals", { isPublic: true });

    res.json({
      categories,
      difficulties,
      equipment,
      goals,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get popular workout plans
export const getPopularWorkoutPlans = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const workoutPlans = await WorkoutPlan.find({ isPublic: true })
      .populate("createdBy", "name email userType trainerProfile")
      .sort({ popularity: -1, averageRating: -1 })
      .limit(parseInt(limit));

    res.json(workoutPlans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Rate a workout plan (only users who have enrolled and completed at least one workout)
export const rateWorkoutPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const plan = await WorkoutPlan.findById(id);
    if (!plan) return res.status(404).json({ message: "Workout plan not found" });

    // User must be enrolled
    const progress = await UserWorkoutProgress.findOne({ userId, workoutPlanId: id });
    if (!progress) {
      return res.status(403).json({ message: "You must be enrolled to rate this plan" });
    }

    // Prevent duplicate rating — store one rating per user in progress
    const alreadyRated = progress.userRating && progress.userRating > 0;
    progress.userRating = rating;
    await progress.save();

    // Recompute aggregate from ALL enrolled users who have rated
    const allProgress = await UserWorkoutProgress.find({
      workoutPlanId: id,
      userRating: { $exists: true, $gt: 0 },
    }).select("userRating");

    const count = allProgress.length;
    const sum = allProgress.reduce((s, p) => s + (p.userRating || 0), 0);
    const newAverage = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    await WorkoutPlan.findByIdAndUpdate(id, {
      averageRating: newAverage,
      totalRatings: count,
    });

    res.json({
      message: alreadyRated ? "Rating updated" : "Rating submitted",
      userRating: rating,
      averageRating: newAverage,
      totalRatings: count,
    });
  } catch (error) {
    console.error("rateWorkoutPlan error:", error);
    res.status(500).json({ message: error.message });
  }
};
