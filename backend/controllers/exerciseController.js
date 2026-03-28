import Exercise from "../models/exercise.js";
import User from "../models/users.js";

// Helper function for building filters
const buildExerciseFilter = (query) => {
  const filter = { isActive: true };
  
  if (query.category) {
    filter.category = query.category;
  }
  
  if (query.difficulty) {
    filter.difficulty = query.difficulty;
  }
  
  if (query.muscleGroups) {
    const muscles = Array.isArray(query.muscleGroups) 
      ? query.muscleGroups 
      : query.muscleGroups.split(',');
    filter.muscleGroups = { $in: muscles };
  }
  
  if (query.equipment) {
    const equipmentList = Array.isArray(query.equipment) 
      ? query.equipment 
      : query.equipment.split(',');
    filter.equipment = { $in: equipmentList };
  }
  
  if (query.tags) {
    const tagList = Array.isArray(query.tags) 
      ? query.tags 
      : query.tags.split(',');
    filter.tags = { $in: tagList };
  }
  
  if (query.search) {
    filter.$text = { $search: query.search };
  }
  
  if (query.minRating) {
    filter.averageRating = { $gte: parseFloat(query.minRating) };
  }
  
  if (query.createdBy) {
    filter.createdBy = query.createdBy;
  }

  return filter;
};

// Helper function for building sort options
const buildSortOptions = (sortBy = "popularity", sortOrder = "desc") => {
  const sortOptions = {};
  const order = sortOrder === "desc" ? -1 : 1;
  
  switch (sortBy) {
    case "popularity":
      sortOptions.popularity = order;
      break;
    case "rating":
      sortOptions.averageRating = order;
      break;
    case "name":
      sortOptions.name = order;
      break;
    case "created":
      sortOptions.createdAt = order;
      break;
    case "updated":
      sortOptions.updatedAt = order;
      break;
    default:
      sortOptions.popularity = -1;
  }
  
  return sortOptions;
};

// Get all exercises with filtering and pagination
export const getExercises = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "popularity",
      sortOrder = "desc"
    } = req.query;

    // Build filter and sort
    const filter = buildExerciseFilter(req.query);
    const sortOptions = buildSortOptions(sortBy, sortOrder);

    // Execute query with pagination
    const exercises = await Exercise.find(filter)
      .populate("createdBy", "name email userType trainerProfile")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // If user is authenticated, add their personal ratings
    if (req.user) {
      const user = await User.findById(req.user._id).select('exerciseRatings');
      const userRatings = user.exerciseRatings || [];
      
      exercises.forEach(exercise => {
        const userRating = userRatings.find(r => r.exerciseId.toString() === exercise._id.toString());
        exercise.userRating = userRating ? userRating.rating : 0;
      });
    } else {
      exercises.forEach(exercise => {
        exercise.userRating = 0;
      });
    }

    const total = await Exercise.countDocuments(filter);

    res.json({
      exercises,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      }
    });
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single exercise by ID
export const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const exercise = await Exercise.findById(id)
      .populate("createdBy", "name email userType")
      .lean();

    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // If user is authenticated, add their personal rating
    if (req.user) {
      const user = await User.findById(req.user._id).select('exerciseRatings');
      const userRating = user.exerciseRatings?.find(r => r.exerciseId.toString() === id);
      exercise.userRating = userRating ? userRating.rating : 0;
    } else {
      exercise.userRating = 0;
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
      existingRating.rating = rating;
      existingRating.ratedAt = new Date();
    } else {
      // Add new rating
      if (!user.exerciseRatings) user.exerciseRatings = [];
      user.exerciseRatings.push({
        exerciseId: id,
        rating,
        ratedAt: new Date(),
      });
    }

    await user.save();

    res.json({
      message: "Exercise rated successfully",
      userRating: rating,
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

// Bulk create exercises (admin/trainer only)
export const bulkCreateExercises = async (req, res) => {
  try {
    const { exercises } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: "Exercises array is required" });
    }

    // Add createdBy to each exercise
    const exercisesWithCreator = exercises.map(ex => ({
      ...ex,
      createdBy: userId,
    }));

    const createdExercises = await Exercise.insertMany(exercisesWithCreator);

    res.status(201).json({
      message: `${createdExercises.length} exercises created successfully`,
      exercises: createdExercises,
      count: createdExercises.length,
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Bulk update exercises (admin only)
export const bulkUpdateExercises = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Updates array is required" });
    }

    const results = [];
    for (const update of updates) {
      if (!update.id) continue;
      
      try {
        const exercise = await Exercise.findByIdAndUpdate(
          update.id,
          update.data,
          { new: true, runValidators: true }
        );
        if (exercise) {
          results.push({ id: update.id, success: true, exercise });
        }
      } catch (err) {
        results.push({ id: update.id, success: false, error: err.message });
      }
    }

    res.json({
      message: "Bulk update completed",
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Bulk delete exercises (admin only)
export const bulkDeleteExercises = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Exercise IDs array is required" });
    }

    // Soft delete by setting isActive to false
    const result = await Exercise.updateMany(
      { _id: { $in: ids } },
      { isActive: false }
    );

    res.json({
      message: "Exercises deleted successfully",
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Duplicate exercise
export const duplicateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const originalExercise = await Exercise.findById(id);
    if (!originalExercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // Create duplicate
    const duplicateData = originalExercise.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    duplicateData.name = `${duplicateData.name} (Copy)`;
    duplicateData.createdBy = userId;
    duplicateData.popularity = 0;
    duplicateData.averageRating = 0;
    duplicateData.totalRatings = 0;

    const duplicate = await Exercise.create(duplicateData);
    await duplicate.populate("createdBy", "name email userType");

    res.status(201).json({
      message: "Exercise duplicated successfully",
      exercise: duplicate,
    });
  } catch (error) {
    console.error('Duplicate exercise error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get exercise statistics
export const getExerciseStats = async (req, res) => {
  try {
    const totalExercises = await Exercise.countDocuments({ isActive: true });
    
    const byCategory = await Exercise.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byDifficulty = await Exercise.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const topRated = await Exercise.find({ isActive: true })
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(5)
      .select('name averageRating totalRatings category');

    const mostPopular = await Exercise.find({ isActive: true })
      .sort({ popularity: -1 })
      .limit(5)
      .select('name popularity averageRating category');

    const avgRating = await Exercise.aggregate([
      { $match: { isActive: true, totalRatings: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: "$averageRating" } } }
    ]);

    res.json({
      totalExercises,
      byCategory,
      byDifficulty,
      topRated,
      mostPopular,
      averageRating: avgRating[0]?.avgRating || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Search exercises with advanced options
export const searchExercises = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Text search with scoring
    const exercises = await Exercise.find(
      { 
        $text: { $search: q },
        isActive: true 
      },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(parseInt(limit))
      .populate("createdBy", "name email userType")
      .lean();

    res.json({
      query: q,
      results: exercises,
      count: exercises.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get similar exercises
export const getSimilarExercises = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    // Find exercises with similar muscle groups or category
    const similar = await Exercise.find({
      _id: { $ne: id },
      isActive: true,
      $or: [
        { muscleGroups: { $in: exercise.muscleGroups } },
        { category: exercise.category },
        { equipment: { $in: exercise.equipment } }
      ]
    })
      .sort({ popularity: -1, averageRating: -1 })
      .limit(parseInt(limit))
      .populate("createdBy", "name email userType")
      .lean();

    res.json(similar);
  } catch (error) {
    console.error('Get similar exercises error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's favorite exercises
export const getFavoriteExercises = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
      path: 'favoriteExercises',
      match: { isActive: true },
      populate: { path: 'createdBy', select: 'name email userType' }
    });

    res.json(user.favoriteExercises || []);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add exercise to favorites
export const addToFavorites = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    const user = await User.findById(userId);
    if (!user.favoriteExercises) {
      user.favoriteExercises = [];
    }

    if (user.favoriteExercises.includes(id)) {
      return res.status(400).json({ message: "Exercise already in favorites" });
    }

    user.favoriteExercises.push(id);
    await user.save();

    res.json({ message: "Exercise added to favorites" });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove exercise from favorites
export const removeFromFavorites = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user.favoriteExercises || !user.favoriteExercises.includes(id)) {
      return res.status(400).json({ message: "Exercise not in favorites" });
    }

    user.favoriteExercises = user.favoriteExercises.filter(
      exerciseId => exerciseId.toString() !== id
    );
    await user.save();

    res.json({ message: "Exercise removed from favorites" });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get exercises created by specific trainer
export const getTrainerExercises = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const exercises = await Exercise.find({
      createdBy: trainerId,
      isActive: true
    })
      .populate("createdBy", "name email userType trainerProfile")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Exercise.countDocuments({
      createdBy: trainerId,
      isActive: true
    });

    res.json({
      exercises,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Get trainer exercises error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Restore deleted exercise (admin only)
export const restoreExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    ).populate("createdBy", "name email userType");

    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    res.json({
      message: "Exercise restored successfully",
      exercise,
    });
  } catch (error) {
    console.error('Restore exercise error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Permanently delete exercise (admin only)
export const permanentlyDeleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByIdAndDelete(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    res.json({ message: "Exercise permanently deleted" });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ message: error.message });
  }
};