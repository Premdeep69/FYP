import { useNotifications } from '@/contexts/NotificationContext';

// System notification types and their configurations
export const SYSTEM_NOTIFICATION_TYPES = {
  // Chat notifications
  NEW_MESSAGE: {
    type: 'new_message',
    icon: '💬',
    category: 'chat',
    priority: 'high'
  },
  TRAINER_RESPONSE: {
    type: 'trainer_response',
    icon: '👨‍🏫',
    category: 'chat',
    priority: 'high'
  },
  
  // Workout notifications
  WORKOUT_COMPLETED: {
    type: 'workout_completed',
    icon: '✅',
    category: 'workout',
    priority: 'medium'
  },
  WORKOUT_REMINDER: {
    type: 'workout_reminder',
    icon: '💪',
    category: 'reminder',
    priority: 'high'
  },
  PLAN_COMPLETED: {
    type: 'plan_completed',
    icon: '🏆',
    category: 'achievement',
    priority: 'high'
  },
  
  // Achievement notifications
  STREAK_MILESTONE: {
    type: 'streak_milestone',
    icon: '🔥',
    category: 'achievement',
    priority: 'high'
  },
  GOAL_ACHIEVED: {
    type: 'goal_achieved',
    icon: '🎯',
    category: 'achievement',
    priority: 'high'
  },
  ACHIEVEMENT_UNLOCKED: {
    type: 'achievement_unlocked',
    icon: '🏅',
    category: 'achievement',
    priority: 'medium'
  },
  
  // Session notifications
  SESSION_REMINDER: {
    type: 'session_reminder',
    icon: '📅',
    category: 'reminder',
    priority: 'high'
  },
  SESSION_BOOKED: {
    type: 'session_booked',
    icon: '✅',
    category: 'session',
    priority: 'medium'
  },
  SESSION_CANCELLED: {
    type: 'session_cancelled',
    icon: '❌',
    category: 'session',
    priority: 'high'
  },
  
  // Payment notifications
  PAYMENT_SUCCESS: {
    type: 'payment_success',
    icon: '💳',
    category: 'payment',
    priority: 'high'
  },
  PAYMENT_FAILED: {
    type: 'payment_failed',
    icon: '❌',
    category: 'payment',
    priority: 'high'
  },
  SUBSCRIPTION_EXPIRING: {
    type: 'subscription_expiring',
    icon: '⚠️',
    category: 'payment',
    priority: 'high'
  },
  SUBSCRIPTION_RENEWED: {
    type: 'subscription_renewed',
    icon: '✅',
    category: 'payment',
    priority: 'medium'
  },
  
  // System notifications
  SYSTEM_UPDATE: {
    type: 'system_update',
    icon: '🔔',
    category: 'system',
    priority: 'low'
  },
  MAINTENANCE: {
    type: 'maintenance',
    icon: '🔧',
    category: 'system',
    priority: 'high'
  },
  ACCOUNT_UPDATE: {
    type: 'account_update',
    icon: '👤',
    category: 'account',
    priority: 'medium'
  },
  
  // General notifications
  SUCCESS: {
    type: 'success',
    icon: '✅',
    category: 'general',
    priority: 'low'
  },
  WARNING: {
    type: 'warning',
    icon: '⚠️',
    category: 'general',
    priority: 'medium'
  },
  ERROR: {
    type: 'error',
    icon: '❌',
    category: 'general',
    priority: 'high'
  },
  INFO: {
    type: 'info',
    icon: 'ℹ️',
    category: 'general',
    priority: 'low'
  }
};

// System notification service
export class SystemNotificationService {
  private addNotification: any;

  constructor(addNotification: any) {
    this.addNotification = addNotification;
  }

  // Chat notifications
  sendNewMessageNotification(senderName: string, message: string, conversationId?: string) {
    this.addNotification({
      type: 'new_message',
      title: `💬 New message from ${senderName}`,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      actionUrl: '/chat',
      data: { conversationId }
    });
  }

  sendTrainerResponseNotification(trainerName: string) {
    this.addNotification({
      type: 'trainer_response',
      title: `👨‍🏫 ${trainerName} responded`,
      message: 'Your trainer has sent you a message. Check it out!',
      actionUrl: '/chat'
    });
  }

  // Workout notifications
  sendWorkoutCompletedNotification(workoutName: string, stats: { duration: number; calories: number }) {
    this.addNotification({
      type: 'workout_completed',
      title: '✅ Workout Completed!',
      message: `Great job on completing ${workoutName}! You burned ${stats.calories} calories in ${stats.duration} minutes.`,
      actionUrl: '/user-dashboard'
    });
  }

  sendWorkoutReminderNotification(workoutPlanName?: string) {
    this.addNotification({
      type: 'workout_reminder',
      title: '💪 Time to Workout!',
      message: workoutPlanName 
        ? `Don't forget your ${workoutPlanName} workout today!`
        : 'Time to get moving! Complete your workout today.',
      actionUrl: '/my-workouts'
    });
  }

  sendPlanCompletedNotification(planName: string) {
    this.addNotification({
      type: 'plan_completed',
      title: '🏆 Workout Plan Completed!',
      message: `Congratulations! You've completed the ${planName} workout plan!`,
      actionUrl: '/my-workouts'
    });
  }

  // Achievement notifications
  sendStreakMilestoneNotification(days: number) {
    this.addNotification({
      type: 'streak_milestone',
      title: '🔥 Streak Milestone!',
      message: `Amazing! You've maintained a ${days}-day workout streak! Keep it up!`,
      actionUrl: '/user-dashboard'
    });
  }

  sendGoalAchievedNotification(goalTitle: string) {
    this.addNotification({
      type: 'goal_achieved',
      title: '🎯 Goal Achieved!',
      message: `Congratulations! You've achieved your goal: ${goalTitle}`,
      actionUrl: '/user-dashboard'
    });
  }

  sendAchievementUnlockedNotification(achievementName: string, description: string) {
    this.addNotification({
      type: 'achievement_unlocked',
      title: '🏅 Achievement Unlocked!',
      message: `${achievementName}: ${description}`,
      actionUrl: '/user-dashboard'
    });
  }

  // Session notifications
  sendSessionReminderNotification(trainerName: string, timeUntil: string) {
    this.addNotification({
      type: 'session_reminder',
      title: '📅 Upcoming Session',
      message: `Your session with ${trainerName} is in ${timeUntil}`,
      actionUrl: '/user-dashboard'
    });
  }

  sendSessionBookedNotification(trainerName: string, date: string) {
    this.addNotification({
      type: 'session_booked',
      title: '✅ Session Booked',
      message: `Your session with ${trainerName} is confirmed for ${date}`,
      actionUrl: '/user-dashboard'
    });
  }

  sendSessionCancelledNotification(trainerName: string) {
    this.addNotification({
      type: 'session_cancelled',
      title: '❌ Session Cancelled',
      message: `Your session with ${trainerName} has been cancelled`,
      actionUrl: '/user-dashboard'
    });
  }

  // Payment notifications
  sendPaymentSuccessNotification(amount: number, description: string) {
    this.addNotification({
      type: 'payment_success',
      title: '💳 Payment Successful',
      message: `Your payment of $${amount} for ${description} was successful`,
      actionUrl: '/subscription'
    });
  }

  sendPaymentFailedNotification(reason?: string) {
    this.addNotification({
      type: 'payment_failed',
      title: '❌ Payment Failed',
      message: reason || 'Your payment could not be processed. Please try again.',
      actionUrl: '/subscription'
    });
  }

  sendSubscriptionExpiringNotification(daysLeft: number) {
    this.addNotification({
      type: 'subscription_expiring',
      title: '⚠️ Subscription Expiring',
      message: `Your subscription will expire in ${daysLeft} days. Renew now to continue.`,
      actionUrl: '/subscription'
    });
  }

  sendSubscriptionRenewedNotification(planName: string) {
    this.addNotification({
      type: 'subscription_renewed',
      title: '✅ Subscription Renewed',
      message: `Your ${planName} subscription has been renewed successfully`,
      actionUrl: '/subscription'
    });
  }

  // System notifications
  sendSystemUpdateNotification(message: string) {
    this.addNotification({
      type: 'system_update',
      title: '🔔 System Update',
      message: message,
      actionUrl: '/'
    });
  }

  sendMaintenanceNotification(scheduledTime: string) {
    this.addNotification({
      type: 'maintenance',
      title: '🔧 Scheduled Maintenance',
      message: `System maintenance scheduled for ${scheduledTime}. Some features may be unavailable.`,
      actionUrl: '/'
    });
  }

  sendAccountUpdateNotification(message: string) {
    this.addNotification({
      type: 'account_update',
      title: '👤 Account Updated',
      message: message,
      actionUrl: '/user-dashboard'
    });
  }

  // General notifications
  sendSuccessNotification(title: string, message: string, actionUrl?: string) {
    this.addNotification({
      type: 'success',
      title: `✅ ${title}`,
      message: message,
      actionUrl: actionUrl || '/'
    });
  }

  sendWarningNotification(title: string, message: string, actionUrl?: string) {
    this.addNotification({
      type: 'warning',
      title: `⚠️ ${title}`,
      message: message,
      actionUrl: actionUrl || '/'
    });
  }

  sendErrorNotification(title: string, message: string, actionUrl?: string) {
    this.addNotification({
      type: 'error',
      title: `❌ ${title}`,
      message: message,
      actionUrl: actionUrl || '/'
    });
  }

  sendInfoNotification(title: string, message: string, actionUrl?: string) {
    this.addNotification({
      type: 'info',
      title: `ℹ️ ${title}`,
      message: message,
      actionUrl: actionUrl || '/'
    });
  }
}

// Hook to use system notifications
export const useSystemNotifications = () => {
  const { addNotification } = useNotifications();
  const service = new SystemNotificationService(addNotification);

  return service;
};
