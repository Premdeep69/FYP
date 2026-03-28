import User from "../models/users.js";
import Workout from "../models/workout.js";
import Session from "../models/session.js";
import Goal from "../models/goal.js";
import notificationService from "../services/notificationService.js";

// Helper function to calculate date ranges
const getDateRanges = () => {
  const now = new Date();
  
  // Today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // This week (Sunday to Saturday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Last week
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfWeek);
  endOfLastWeek.setMilliseconds(-1);

  // This month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Last month
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Last 7 days
  const last7Days = new Date(now);
  last7Days.setDate(last7Days.getDate() - 6);
  last7Days.setHours(0, 0, 0, 0);

  // Last 30 days
  const last30Days = new Date(now);
  last30Days.setDate(last30Days.getDate() - 29);
  last30Days.setHours(0, 0, 0, 0);

  return {
    startOfToday,
    endOfToday,
    startOfWeek,
    endOfWeek,
    startOfLastWeek,
    endOfLastWeek,
    startOfMonth,
    endOfMonth,
    startOfLastMonth,
    endOfLastMonth,
    last7Days,
    last30Days
  };
};

// Calculate workout streak
const calculateStreak = async (userId) => {
  const workouts = await Workout.find({ 
    userId, 
    status: "completed" 
  }).sort({ completedAt: -1 });

  if (workouts.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Check if there's a workout today or yesterday
  const lastWorkoutDate = new Date(workouts[0].completedAt);
  lastWorkoutDate.setHours(0, 0, 0, 0);
  const daysSinceLastWorkout = Math.floor((currentDate - lastWorkoutDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastWorkout > 1) return 0; // Streak broken

  // Calculate streak
  const workoutDates = new Set();
  workouts.forEach(workout => {
    const date = new Date(workout.completedAt);
    date.setHours(0, 0, 0, 0);
    workoutDates.add(date.getTime());
  });

  let checkDate = new Date(currentDate);
  while (workoutDates.has(checkDate.getTime())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
};

// Calculate longest streak
const calculateLongestStreak = async (userId) => {
  const workouts = await Workout.find({ 
    userId, 
    status: "completed" 
  }).sort({ completedAt: 1 });

  if (workouts.length === 0) return 0;

  const workoutDates = new Set();
  workouts.forEach(workout => {
    const date = new Date(workout.completedAt);
    date.setHours(0, 0, 0, 0);
    workoutDates.add(date.getTime());
  });

  const sortedDates = Array.from(workoutDates).sort((a, b) => a - b);
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    if (daysDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
};

// Get weekly activity data (last 7 days)
const getWeeklyActivityData = async (userId) => {
  const { last7Days } = getDateRanges();
  
  const workouts = await Workout.find({
    userId,
    completedAt: { $gte: last7Days },
    status: "completed"
  });

  // Create array for last 7 days
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activityData = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    
    const dayWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.completedAt);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === date.getTime();
    });

    activityData.push({
      day: days[date.getDay()],
      date: date.toISOString().split('T')[0],
      workouts: dayWorkouts.length,
      calories: dayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
      minutes: dayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
    });
  }

  return activityData;
};

// Get monthly progress data (last 4 weeks)
const getMonthlyProgressData = async (userId) => {
  const progressData = [];
  
  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const workouts = await Workout.find({
      userId,
      completedAt: { $gte: weekStart, $lte: weekEnd },
      status: "completed"
    });

    progressData.push({
      week: `Week ${4 - i}`,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      workouts: workouts.length,
      calories: workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
      minutes: workouts.reduce((sum, w) => sum + (w.duration || 0), 0)
    });
  }

  return progressData;
};

// Get workout type distribution
const getWorkoutTypeDistribution = async (userId) => {
  const { last30Days } = getDateRanges();
  
  const workouts = await Workout.find({
    userId,
    completedAt: { $gte: last30Days },
    status: "completed"
  });

  const distribution = {};
  workouts.forEach(workout => {
    const type = workout.type || 'other';
    distribution[type] = (distribution[type] || 0) + 1;
  });

  const total = workouts.length || 1;
  const colors = {
    strength: '#3b82f6',
    cardio: '#10b981',
    flexibility: '#f59e0b',
    hiit: '#ef4444',
    yoga: '#8b5cf6',
    other: '#6b7280'
  };

  return Object.entries(distribution).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round((count / total) * 100),
    count: count,
    color: colors[name] || colors.other
  }));
};

// Get user dashboard data
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password");

    const { 
      startOfWeek, 
      endOfWeek, 
      startOfLastWeek, 
      endOfLastWeek,
      startOfMonth,
      endOfMonth 
    } = getDateRanges();

    // Get this week's workouts
    const weeklyWorkouts = await Workout.find({
      userId,
      completedAt: { $gte: startOfWeek, $lte: endOfWeek },
      status: "completed"
    });

    // Get last week's workouts for comparison
    const lastWeekWorkouts = await Workout.find({
      userId,
      completedAt: { $gte: startOfLastWeek, $lte: endOfLastWeek },
      status: "completed"
    });

    // Get this month's workouts
    const monthlyWorkouts = await Workout.find({
      userId,
      completedAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: "completed"
    });

    // Calculate weekly stats
    const weeklyStats = {
      workoutSessions: weeklyWorkouts.length,
      totalMinutes: weeklyWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0),
      totalCalories: weeklyWorkouts.reduce((sum, workout) => sum + (workout.caloriesBurned || 0), 0),
    };

    // Calculate last week stats for comparison
    const lastWeekStats = {
      workoutSessions: lastWeekWorkouts.length,
      totalMinutes: lastWeekWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0),
      totalCalories: lastWeekWorkouts.reduce((sum, workout) => sum + (workout.caloriesBurned || 0), 0),
    };

    // Calculate monthly stats
    const monthlyStats = {
      workoutSessions: monthlyWorkouts.length,
      totalMinutes: monthlyWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0),
      totalCalories: monthlyWorkouts.reduce((sum, workout) => sum + (workout.caloriesBurned || 0), 0),
    };

    // Calculate comparisons
    const comparisons = {
      workouts: weeklyStats.workoutSessions - lastWeekStats.workoutSessions,
      minutes: weeklyStats.totalMinutes - lastWeekStats.totalMinutes,
      calories: weeklyStats.totalCalories - lastWeekStats.totalCalories,
    };

    // Get active goals
    const activeGoals = await Goal.find({
      userId,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    // Get recent workouts
    const recentWorkouts = await Workout.find({ 
      userId,
      status: "completed"
    })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate('trainerId', 'name');

    // Calculate streaks
    const currentStreak = await calculateStreak(userId);
    const longestStreak = await calculateLongestStreak(userId);

    // Update user stats if needed
    if (user.stats.longestStreak < longestStreak) {
      await User.findByIdAndUpdate(userId, {
        'stats.longestStreak': longestStreak,
        'stats.currentStreak': currentStreak
      });
    }

    // Get aggregated data for charts
    const weeklyActivityData = await getWeeklyActivityData(userId);
    const monthlyProgressData = await getMonthlyProgressData(userId);
    const workoutTypeDistribution = await getWorkoutTypeDistribution(userId);

    // Calculate average workout duration
    const avgWorkoutDuration = weeklyWorkouts.length > 0
      ? Math.round(weeklyStats.totalMinutes / weeklyWorkouts.length)
      : 0;

    // Calculate total workouts (all time)
    const totalWorkouts = await Workout.countDocuments({ 
      userId, 
      status: "completed" 
    });

    // Get workout frequency (workouts per week average over last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const last4WeeksWorkouts = await Workout.countDocuments({
      userId,
      completedAt: { $gte: fourWeeksAgo },
      status: "completed"
    });
    const avgWorkoutsPerWeek = Math.round(last4WeeksWorkouts / 4);

    res.json({
      user: {
        name: user.name,
        email: user.email,
        profile: user.profile,
        stats: {
          totalWorkouts,
          totalMinutes: user.stats?.totalMinutes || 0,
          totalCalories: user.stats?.totalCalories || 0,
          currentStreak,
          longestStreak,
          lastWorkout: user.stats?.lastWorkout
        }
      },
      weeklyStats,
      lastWeekStats,
      monthlyStats,
      comparisons,
      currentStreak,
      longestStreak,
      avgWorkoutDuration,
      avgWorkoutsPerWeek,
      activeGoals,
      recentWorkouts,
      // Chart data
      weeklyActivityData,
      monthlyProgressData,
      workoutTypeDistribution
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get trainer dashboard data
export const getTrainerDashboard = async (req, res) => {
  try {
    const trainerId = req.user._id;
    const trainer = await User.findById(trainerId).select("-password");

    // Get today's sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = await Session.find({
      trainerId,
      scheduledDate: { $gte: today, $lt: tomorrow }
    }).populate('clientId', 'name email').sort({ scheduledDate: 1 });

    // Get active clients (clients with sessions in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeClients = await Session.aggregate([
      {
        $match: {
          trainerId: trainerId,
          scheduledDate: { $gte: thirtyDaysAgo },
          status: { $in: ["completed", "confirmed", "scheduled"] }
        }
      },
      {
        $group: {
          _id: "$clientId",
          lastSession: { $max: "$scheduledDate" },
          totalSessions: { $sum: 1 },
          totalEarnings: { $sum: "$price" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "client"
        }
      },
      {
        $unwind: "$client"
      },
      {
        $project: {
          name: "$client.name",
          email: "$client.email",
          lastSession: 1,
          totalSessions: 1,
          totalEarnings: 1
        }
      },
      { $sort: { lastSession: -1 } },
      { $limit: 10 }
    ]);

    // Calculate earnings
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyEarnings = await Session.aggregate([
      {
        $match: {
          trainerId: trainerId,
          scheduledDate: { $gte: currentMonth },
          status: "completed"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$price" }
        }
      }
    ]);

    const todayEarnings = await Session.aggregate([
      {
        $match: {
          trainerId: trainerId,
          scheduledDate: { $gte: today, $lt: tomorrow },
          status: "completed"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$price" }
        }
      }
    ]);

    // Get stats
    const stats = {
      activeClients: activeClients.length,
      monthlyEarnings: monthlyEarnings[0]?.total || 0,
      todayEarnings: todayEarnings[0]?.total || 0,
      todaySessions: todaySessions.length,
      rating: trainer.trainerProfile?.rating?.average || 0
    };

    res.json({
      trainer: {
        name: trainer.name,
        email: trainer.email,
        trainerProfile: trainer.trainerProfile
      },
      stats,
      todaySessions,
      activeClients
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Log a workout
export const logWorkout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, type, duration, caloriesBurned, exercises, notes } = req.body;

    const workout = await Workout.create({
      userId,
      name,
      type,
      duration,
      caloriesBurned,
      exercises,
      notes,
      status: "completed",
      completedAt: new Date()
    });

    // Update user stats
    const user = await User.findById(userId);
    const newTotalWorkouts = (user.stats?.totalWorkouts || 0) + 1;
    const newTotalMinutes = (user.stats?.totalMinutes || 0) + duration;
    const newTotalCalories = (user.stats?.totalCalories || 0) + caloriesBurned;

    // Calculate new streaks
    const currentStreak = await calculateStreak(userId);
    const longestStreak = await calculateLongestStreak(userId);

    await User.findByIdAndUpdate(userId, {
      $set: {
        'stats.totalWorkouts': newTotalWorkouts,
        'stats.totalMinutes': newTotalMinutes,
        'stats.totalCalories': newTotalCalories,
        'stats.currentStreak': currentStreak,
        'stats.longestStreak': Math.max(longestStreak, user.stats?.longestStreak || 0),
        'stats.lastWorkout': new Date()
      }
    });

    // Trigger notifications asynchronously (don't wait for them)
    setImmediate(async () => {
      try {
        // Send workout completed notification
        if (user.preferences?.progressUpdates !== false) {
          await notificationService.sendWorkoutCompleted(userId, name, {
            calories: caloriesBurned,
            duration
          });
        }

        // Check for streak milestones
        await notificationService.checkStreakMilestones(userId, currentStreak);

        // Check for achievement unlocks
        if (newTotalWorkouts === 1) {
          await notificationService.sendAchievementUnlocked(
            userId,
            'First Workout',
            'Completed your first workout!'
          );
        } else if (newTotalWorkouts === 10) {
          await notificationService.sendAchievementUnlocked(
            userId,
            '10 Workouts',
            'Completed 10 workouts!'
          );
        } else if (newTotalWorkouts === 50) {
          await notificationService.sendAchievementUnlocked(
            userId,
            '50 Workouts',
            'Completed 50 workouts!'
          );
        } else if (newTotalWorkouts === 100) {
          await notificationService.sendAchievementUnlocked(
            userId,
            'Century Club',
            'Completed 100 workouts!'
          );
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }
    });

    res.status(201).json({ 
      message: "Workout logged successfully", 
      workout,
      stats: {
        totalWorkouts: newTotalWorkouts,
        totalMinutes: newTotalMinutes,
        totalCalories: newTotalCalories,
        currentStreak,
        longestStreak
      }
    });
  } catch (error) {
    console.error('Log workout error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create or update goals
export const updateGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goals } = req.body;

    // Delete existing active goals
    await Goal.deleteMany({ userId, isActive: true });

    // Create new goals
    const newGoals = goals.map(goal => ({
      ...goal,
      userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
    }));

    const createdGoals = await Goal.insertMany(newGoals);

    res.json({ message: "Goals updated successfully", goals: createdGoals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get detailed workout analytics
export const getWorkoutAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query; // days

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));
    daysAgo.setHours(0, 0, 0, 0);

    const workouts = await Workout.find({
      userId,
      completedAt: { $gte: daysAgo },
      status: "completed"
    }).sort({ completedAt: 1 });

    // Calculate analytics
    const analytics = {
      totalWorkouts: workouts.length,
      totalMinutes: workouts.reduce((sum, w) => sum + (w.duration || 0), 0),
      totalCalories: workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
      avgDuration: workouts.length > 0 
        ? Math.round(workouts.reduce((sum, w) => sum + (w.duration || 0), 0) / workouts.length)
        : 0,
      avgCalories: workouts.length > 0
        ? Math.round(workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0) / workouts.length)
        : 0,
      workoutsByType: {},
      workoutsByDay: {},
      mostActiveDay: null,
      mostCommonType: null
    };

    // Group by type
    workouts.forEach(workout => {
      const type = workout.type || 'other';
      if (!analytics.workoutsByType[type]) {
        analytics.workoutsByType[type] = {
          count: 0,
          totalMinutes: 0,
          totalCalories: 0
        };
      }
      analytics.workoutsByType[type].count++;
      analytics.workoutsByType[type].totalMinutes += workout.duration || 0;
      analytics.workoutsByType[type].totalCalories += workout.caloriesBurned || 0;
    });

    // Group by day of week
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    workouts.forEach(workout => {
      const day = days[new Date(workout.completedAt).getDay()];
      analytics.workoutsByDay[day] = (analytics.workoutsByDay[day] || 0) + 1;
    });

    // Find most active day
    let maxWorkouts = 0;
    Object.entries(analytics.workoutsByDay).forEach(([day, count]) => {
      if (count > maxWorkouts) {
        maxWorkouts = count;
        analytics.mostActiveDay = day;
      }
    });

    // Find most common type
    let maxTypeCount = 0;
    Object.entries(analytics.workoutsByType).forEach(([type, data]) => {
      if (data.count > maxTypeCount) {
        maxTypeCount = data.count;
        analytics.mostCommonType = type;
      }
    });

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get workout history with pagination
export const getWorkoutHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

    const query = { userId, status: "completed" };
    
    if (type) query.type = type;
    if (startDate || endDate) {
      query.completedAt = {};
      if (startDate) query.completedAt.$gte = new Date(startDate);
      if (endDate) query.completedAt.$lte = new Date(endDate);
    }

    const total = await Workout.countDocuments(query);
    const workouts = await Workout.find(query)
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('trainerId', 'name');

    res.json({
      workouts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Workout history error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update workout
export const updateWorkout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workoutId } = req.params;
    const updates = req.body;

    const workout = await Workout.findOne({ _id: workoutId, userId });
    if (!workout) {
      return res.status(404).json({ message: "Workout not found" });
    }

    // Calculate difference for stats update
    const durationDiff = (updates.duration || workout.duration) - workout.duration;
    const caloriesDiff = (updates.caloriesBurned || workout.caloriesBurned) - workout.caloriesBurned;

    // Update workout
    Object.assign(workout, updates);
    await workout.save();

    // Update user stats
    if (durationDiff !== 0 || caloriesDiff !== 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'stats.totalMinutes': durationDiff,
          'stats.totalCalories': caloriesDiff
        }
      });
    }

    res.json({ message: "Workout updated successfully", workout });
  } catch (error) {
    console.error('Update workout error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete workout
export const deleteWorkout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workoutId } = req.params;

    const workout = await Workout.findOne({ _id: workoutId, userId });
    if (!workout) {
      return res.status(404).json({ message: "Workout not found" });
    }

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'stats.totalWorkouts': -1,
        'stats.totalMinutes': -(workout.duration || 0),
        'stats.totalCalories': -(workout.caloriesBurned || 0)
      }
    });

    await workout.deleteOne();

    // Recalculate streaks
    const currentStreak = await calculateStreak(userId);
    const longestStreak = await calculateLongestStreak(userId);

    await User.findByIdAndUpdate(userId, {
      'stats.currentStreak': currentStreak,
      'stats.longestStreak': longestStreak
    });

    res.json({ message: "Workout deleted successfully" });
  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      bio,
      age,
      height,
      weight,
      fitnessLevel,
      goals,
      avatar, // base64 data URL
    } = req.body;

    const updateFields = {};

    if (name) updateFields.name = name.trim();
    if (bio !== undefined) updateFields["profile.bio"] = bio;
    if (age !== undefined) updateFields["profile.age"] = age ? Number(age) : undefined;
    if (height !== undefined) updateFields["profile.height"] = height ? Number(height) : undefined;
    if (weight !== undefined) updateFields["profile.weight"] = weight ? Number(weight) : undefined;
    if (fitnessLevel) updateFields["profile.fitnessLevel"] = fitnessLevel;
    if (goals) updateFields["profile.goals"] = goals;
    if (avatar !== undefined) updateFields["profile.avatar"] = avatar;

    // Remove undefined values
    Object.keys(updateFields).forEach(
      (k) => updateFields[k] === undefined && delete updateFields[k]
    );

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        isActive: user.isActive,
        trainerVerification: user.trainerVerification,
        profile: user.profile,
        trainerProfile: user.trainerProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update trainer profile
export const updateTrainerProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      bio,
      specializations,
      certifications,
      experience,
      hourlyRate,
      avatar,
    } = req.body;

    const updateFields = {};

    if (name) updateFields.name = name.trim();
    if (bio !== undefined) updateFields["trainerProfile.bio"] = bio;
    if (specializations) updateFields["trainerProfile.specializations"] = specializations;
    if (certifications) updateFields["trainerProfile.certifications"] = certifications;
    if (experience !== undefined) updateFields["trainerProfile.experience"] = Number(experience);
    if (hourlyRate !== undefined) updateFields["trainerProfile.hourlyRate"] = Number(hourlyRate);
    if (avatar !== undefined) updateFields["trainerProfile.profileImage"] = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isVerified: user.isVerified,
        isActive: user.isActive,
        trainerVerification: user.trainerVerification,
        profile: user.profile,
        trainerProfile: user.trainerProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
