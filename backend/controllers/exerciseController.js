import Exercise from "../models/exercise.js";
import User from "../models/users.js";

// Get all exercises with filtering and pagination
export const getExercises = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      muscleGroups,
      equipment,
      search,
      sortBy = "popularity",
      sortOrder = "desc"
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (muscleGroups) {
      const muscles = Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups];
      filter.muscleGroups = { $in: muscles };
    }
    if (equipment) {
      const equipmentList = Array.isArray(equipment) ? equipment : [equipment];
      filter.equipment = { $in: equipmentList };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortOptions = {};
    if (sortBy === "popularity") sortOptions.popularity = sortOrder === "desc" ? -1 : 1;
    else if (sortBy === "rating") sortOptions.averageRating = sortOrder === "desc" ? -1 : 1;
    else if (sortBy === "name") sortOptions.name = sortOrder === "desc" ? -1 : 1;
    else if (sortBy === "created") sortOptions.createdAt = sortOrder === "desc" ? -1 : 1;

    const exercises = await Exercise.find(filter)
      .populate("createdBy", "name email userType")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Exercise.countDocuments(filter);

    res.json({
      exercises,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single exercise by ID
export const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const exercise = await Exercise.findById(id)
      .populate("createdBy", "name email userType");

    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // Increment popularity
    await Exercise.findByIdAndUpdate(id, { $inc: { popularity: 1 } });

    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new exercise (trainers only)
export const createExercise = async (req, res) => {
  try {
    const userId = req.user._id;
    const exerciseData = {
      ...req.body,
      createdBy: userId,
    };

    const exercise = await Exercise.create(exerciseData);
    await exercise.populate("createdBy", "name email userType");

    res.status(201).json({
      message: "Exercise created successfully",
      exercise,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update exercise (creator or admin only)
export const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // Check if user is the creator or admin
    if (exercise.createdBy.toString() !== userId.toString() && req.user.userType !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this exercise" });
    }

    const updatedExercise = await Exercise.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate("createdBy", "name email userType");

    res.json({
      message: "Exercise updated successfully",
      exercise: updatedExercise,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete exercise (creator or admin only)
export const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // Check if user is the creator or admin
    if (exercise.createdBy.toString() !== userId.toString() && req.user.userType !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this exercise" });
    }

    // Soft delete by setting isActive to false
    await Exercise.findByIdAndUpdate(id, { isActive: false });

    res.json({ message: "Exercise deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exercise categories and filters
export const getExerciseFilters = async (req, res) => {
  try {
    const categories = await Exercise.distinct("category", { isActive: true });
    const muscleGroups = await Exercise.distinct("muscleGroups", { isActive: true });
    const equipment = await Exercise.distinct("equipment", { isActive: true });
    const difficulties = await Exercise.distinct("difficulty", { isActive: true });

    res.json({
      categories,
      muscleGroups,
      equipment,
      difficulties,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Rate an exercise
export const rateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user._id;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // Check if user already rated this exercise
    const user = await User.findById(userId);
    const existingRating = user.exerciseRatings?.find(r => r.exerciseId.toString() === id);

    if (existingRating) {
      // Update existing rating
      const oldRating = existingRating.rating;
      existingRating.rating = rating;
      existingRating.ratedAt = new Date();
      
      // Update exercise average rating
      const newTotal = (exercise.averageRating * exercise.totalRatings) - oldRating + rating;
      exercise.averageRating = newTotal / exercise.totalRatings;
    } else {
      // Add new rating
      if (!user.exerciseRatings) user.exerciseRatings = [];
      user.exerciseRatings.push({
        exerciseId: id,
        rating,
        ratedAt: new Date(),
      });

      // Update exercise rating stats
      const newTotal = (exercise.averageRating * exercise.totalRatings) + rating;
      exercise.totalRatings += 1;
      exercise.averageRating = newTotal / exercise.totalRatings;
    }

    await user.save();
    await exercise.save();

    res.json({
      message: "Exercise rated successfully",
      averageRating: exercise.averageRating,
      totalRatings: exercise.totalRatings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get popular exercises
export const getPopularExercises = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const exercises = await Exercise.find({ isActive: true })
      .populate("createdBy", "name email userType")
      .sort({ popularity: -1, averageRating: -1 })
      .limit(parseInt(limit));

    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exercises by muscle group
export const getExercisesByMuscleGroup = async (req, res) => {
  try {
    const { muscleGroup } = req.params;
    const { limit = 20 } = req.query;

    const exercises = await Exercise.find({
      isActive: true,
      muscleGroups: muscleGroup,
    })
      .populate("createdBy", "name email userType")
      .sort({ popularity: -1 })
      .limit(parseInt(limit));

    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};