import User from "../models/users.js";
import Workout from "../models/workout.js";
import Session from "../models/session.js";
import Goal from "../models/goal.js";

// Get user dashboard data
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password");

    // Get current week's workouts
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyWorkouts = await Workout.find({
      userId,
      completedAt: { $gte: startOfWeek, $lte: endOfWeek },
      status: "completed"
    });

    // Get active goals
    const activeGoals = await Goal.find({
      userId,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    // Calculate weekly stats
    const weeklyStats = {
      workoutSessions: weeklyWorkouts.length,
      totalMinutes: weeklyWorkouts.reduce((sum, workout) => sum + workout.duration, 0),
      totalCalories: weeklyWorkouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0),
    };

    // Get recent workouts
    const recentWorkouts = await Workout.find({ userId })
      .sort({ completedAt: -1 })
      .limit(5)
      .populate('trainerId', 'name');

    // Calculate streak
    const calculateStreak = async () => {
      const workouts = await Workout.find({ 
        userId, 
        status: "completed" 
      }).sort({ completedAt: -1 });

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      for (let workout of workouts) {
        const workoutDate = new Date(workout.completedAt);
        workoutDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate - workoutDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === streak) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (daysDiff > streak) {
          break;
        }
      }

      return streak;
    };

    const currentStreak = await calculateStreak();

    res.json({
      user: {
        name: user.name,
        email: user.email,
        profile: user.profile,
        stats: user.stats
      },
      weeklyStats,
      currentStreak,
      activeGoals,
      recentWorkouts
    });
  } catch (error) {
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
      notes
    });

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'stats.totalWorkouts': 1,
        'stats.totalMinutes': duration,
        'stats.totalCalories': caloriesBurned
      },
      'stats.lastWorkout': new Date()
    });

    res.status(201).json({ message: "Workout logged successfully", workout });
  } catch (error) {
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