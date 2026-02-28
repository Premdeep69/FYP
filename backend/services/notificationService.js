import { sendNotification, sendMulticastNotification } from '../config/firebase.js';
import User from '../models/users.js';
import UserWorkoutProgress from '../models/userWorkoutProgress.js';

// Notification Types
export const NOTIFICATION_TYPES = {
  WORKOUT_REMINDER: 'workout_reminder',
  STREAK_MILESTONE: 'streak_milestone',
  GOAL_ACHIEVED: 'goal_achieved',
  WORKOUT_COMPLETED: 'workout_completed',
  NEW_MESSAGE: 'new_message',
  PLAN_COMPLETED: 'plan_completed',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  TRAINER_RESPONSE: 'trainer_response',
  SESSION_REMINDER: 'session_reminder'
};

// Send workout reminder notification
export const sendWorkoutReminder = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      console.log('User not found or no FCM token');
      return;
    }

    // Get user's active workout plan
    const activeWorkout = await UserWorkoutProgress.findOne({
      userId,
      status: 'active'
    }).populate('workoutPlanId');

    if (!activeWorkout) {
      console.log('No active workout plan found');
      return;
    }

    const notification = {
      title: '💪 Time to Workout!',
      body: `Don't forget your ${activeWorkout.workoutPlanId.name} workout today!`
    };

    const data = {
      type: NOTIFICATION_TYPES.WORKOUT_REMINDER,
      workoutPlanId: activeWorkout.workoutPlanId._id.toString(),
      clickAction: '/my-workouts'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Workout reminder sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending workout reminder:', error);
  }
};

// Send streak milestone notification
export const sendStreakMilestone = async (userId, streakDays) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const milestones = [7, 14, 30, 60, 90, 180, 365];
    if (!milestones.includes(streakDays)) return;

    const notification = {
      title: '🔥 Streak Milestone!',
      body: `Amazing! You've maintained a ${streakDays}-day workout streak! Keep it up!`
    };

    const data = {
      type: NOTIFICATION_TYPES.STREAK_MILESTONE,
      streakDays: streakDays.toString(),
      clickAction: '/user-dashboard'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Streak milestone notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending streak milestone:', error);
  }
};

// Send goal achieved notification
export const sendGoalAchieved = async (userId, goalTitle) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const notification = {
      title: '🎯 Goal Achieved!',
      body: `Congratulations! You've achieved your goal: ${goalTitle}`
    };

    const data = {
      type: NOTIFICATION_TYPES.GOAL_ACHIEVED,
      goalTitle,
      clickAction: '/user-dashboard'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Goal achieved notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending goal achieved:', error);
  }
};

// Send workout completed notification
export const sendWorkoutCompleted = async (userId, workoutName, stats) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const notification = {
      title: '✅ Workout Completed!',
      body: `Great job on completing ${workoutName}! You burned ${stats.calories} calories in ${stats.duration} minutes.`
    };

    const data = {
      type: NOTIFICATION_TYPES.WORKOUT_COMPLETED,
      workoutName,
      calories: stats.calories.toString(),
      duration: stats.duration.toString(),
      clickAction: '/user-dashboard'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Workout completed notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending workout completed:', error);
  }
};

// Send new message notification
export const sendNewMessageNotification = async (recipientId, senderName, messagePreview) => {
  try {
    const user = await User.findById(recipientId);
    if (!user || !user.fcmToken) return;

    const notification = {
      title: `💬 New message from ${senderName}`,
      body: messagePreview.substring(0, 100)
    };

    const data = {
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      senderId: senderName,
      clickAction: '/chat'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`New message notification sent to user ${recipientId}`);
  } catch (error) {
    console.error('Error sending new message notification:', error);
  }
};

// Send plan completed notification
export const sendPlanCompleted = async (userId, planName) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const notification = {
      title: '🏆 Workout Plan Completed!',
      body: `Congratulations! You've completed the ${planName} workout plan!`
    };

    const data = {
      type: NOTIFICATION_TYPES.PLAN_COMPLETED,
      planName,
      clickAction: '/my-workouts'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Plan completed notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending plan completed:', error);
  }
};

// Send achievement unlocked notification
export const sendAchievementUnlocked = async (userId, achievementName, achievementDescription) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const notification = {
      title: '🏅 Achievement Unlocked!',
      body: `${achievementName}: ${achievementDescription}`
    };

    const data = {
      type: NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED,
      achievementName,
      clickAction: '/user-dashboard'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Achievement notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending achievement notification:', error);
  }
};

// Send trainer response notification
export const sendTrainerResponse = async (userId, trainerName) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const notification = {
      title: `👨‍🏫 ${trainerName} responded`,
      body: 'Your trainer has sent you a message. Check it out!'
    };

    const data = {
      type: NOTIFICATION_TYPES.TRAINER_RESPONSE,
      trainerName,
      clickAction: '/chat'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Trainer response notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending trainer response:', error);
  }
};

// Send session reminder notification
export const sendSessionReminder = async (userId, sessionDetails) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const notification = {
      title: '📅 Upcoming Session',
      body: `Your session with ${sessionDetails.trainerName} is in ${sessionDetails.timeUntil}`
    };

    const data = {
      type: NOTIFICATION_TYPES.SESSION_REMINDER,
      sessionId: sessionDetails.sessionId,
      clickAction: '/user-dashboard'
    };

    await sendNotification(user.fcmToken, notification, data);
    console.log(`Session reminder sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending session reminder:', error);
  }
};

// Schedule daily workout reminders (to be called by a cron job)
export const scheduleDailyWorkoutReminders = async () => {
  try {
    // Find all users with active workout plans and reminder preferences
    const users = await User.find({
      fcmToken: { $exists: true, $ne: null },
      'preferences.workoutReminders': true
    });

    console.log(`Scheduling reminders for ${users.length} users`);

    for (const user of users) {
      // Check if user has an active workout plan
      const activeWorkout = await UserWorkoutProgress.findOne({
        userId: user._id,
        status: 'active'
      });

      if (activeWorkout) {
        await sendWorkoutReminder(user._id);
      }
    }

    console.log('Daily workout reminders scheduled successfully');
  } catch (error) {
    console.error('Error scheduling daily reminders:', error);
  }
};

// Check and send streak milestone notifications
export const checkStreakMilestones = async (userId, currentStreak) => {
  const milestones = [7, 14, 30, 60, 90, 180, 365];
  
  if (milestones.includes(currentStreak)) {
    await sendStreakMilestone(userId, currentStreak);
  }
};

// Check and send goal achievement notifications
export const checkGoalAchievement = async (userId, goals) => {
  for (const goal of goals) {
    if (goal.currentValue >= goal.targetValue && !goal.achieved) {
      await sendGoalAchieved(userId, goal.title);
      // Mark goal as achieved in database
      goal.achieved = true;
    }
  }
};

export default {
  sendWorkoutReminder,
  sendStreakMilestone,
  sendGoalAchieved,
  sendWorkoutCompleted,
  sendNewMessageNotification,
  sendPlanCompleted,
  sendAchievementUnlocked,
  sendTrainerResponse,
  sendSessionReminder,
  scheduleDailyWorkoutReminders,
  checkStreakMilestones,
  checkGoalAchievement
};
