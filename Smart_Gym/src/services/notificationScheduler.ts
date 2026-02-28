import { useNotifications } from '@/contexts/NotificationContext';

// Daily reminder scheduler for frontend
export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private addNotification: any;

  private constructor() {}

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  initialize(addNotification: any) {
    this.addNotification = addNotification;
    this.startDailyReminders();
  }

  private startDailyReminders() {
    // Check every hour if it's time to send reminder
    this.intervalId = setInterval(() => {
      this.checkAndSendReminder();
    }, 60 * 60 * 1000); // Check every hour

    // Also check immediately on startup
    this.checkAndSendReminder();
  }

  private checkAndSendReminder() {
    const now = new Date();
    const hour = now.getHours();
    const lastReminderDate = localStorage.getItem('lastReminderDate');
    const today = now.toDateString();

    // Get user's preferred reminder time (default 9 AM)
    const reminderHour = parseInt(localStorage.getItem('reminderHour') || '9');

    // Send reminder if:
    // 1. It's the reminder hour
    // 2. We haven't sent a reminder today
    if (hour === reminderHour && lastReminderDate !== today) {
      this.sendDailyReminder();
      localStorage.setItem('lastReminderDate', today);
    }
  }

  private sendDailyReminder() {
    if (!this.addNotification) return;

    const messages = [
      "Time to crush your workout goals today! 💪",
      "Your body is counting on you. Let's get moving! 🏃",
      "Don't skip today - your future self will thank you! 🎯",
      "Ready to make today count? Let's workout! 🔥",
      "Consistency is key. Time for your daily workout! ⚡"
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.addNotification({
      type: 'workout_reminder',
      title: '💪 Daily Workout Reminder',
      message: randomMessage,
      actionUrl: '/my-workouts'
    });

    // Also show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('💪 Daily Workout Reminder', {
        body: randomMessage,
        icon: '/gym_logo.jpg',
        badge: '/gym_logo.jpg',
        tag: 'daily-reminder',
        requireInteraction: false
      });
    }
  }

  // Manual trigger for testing
  sendTestReminder() {
    this.sendDailyReminder();
  }

  // Update reminder time
  setReminderTime(hour: number) {
    if (hour >= 0 && hour <= 23) {
      localStorage.setItem('reminderHour', hour.toString());
    }
  }

  // Get current reminder time
  getReminderTime(): number {
    return parseInt(localStorage.getItem('reminderHour') || '9');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Hook to use notification scheduler
export const useNotificationScheduler = () => {
  const { addNotification } = useNotifications();
  const scheduler = NotificationScheduler.getInstance();

  const initializeScheduler = () => {
    scheduler.initialize(addNotification);
  };

  const sendTestReminder = () => {
    scheduler.sendTestReminder();
  };

  const setReminderTime = (hour: number) => {
    scheduler.setReminderTime(hour);
  };

  const getReminderTime = () => {
    return scheduler.getReminderTime();
  };

  return {
    initializeScheduler,
    sendTestReminder,
    setReminderTime,
    getReminderTime
  };
};
