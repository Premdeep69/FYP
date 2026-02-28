import cron from 'node-cron';
import notificationService from '../services/notificationService.js';

// Schedule daily workout reminders
// Runs every day at 9:00 AM
export const scheduleDailyReminders = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily workout reminders job...');
    try {
      await notificationService.scheduleDailyWorkoutReminders();
      console.log('Daily workout reminders completed');
    } catch (error) {
      console.error('Error in daily reminders job:', error);
    }
  }, {
    timezone: "America/New_York" // Adjust to your timezone
  });

  console.log('Daily workout reminders scheduler initialized');
};

// Schedule evening motivation (optional)
// Runs every day at 6:00 PM
export const scheduleEveningMotivation = () => {
  cron.schedule('0 18 * * *', async () => {
    console.log('Running evening motivation job...');
    // Add logic for evening motivation notifications
  }, {
    timezone: "America/New_York"
  });

  console.log('Evening motivation scheduler initialized');
};

// Initialize all schedulers
export const initializeSchedulers = () => {
  scheduleDailyReminders();
  // scheduleEveningMotivation(); // Uncomment if needed
  
  console.log('All notification schedulers initialized');
};

export default {
  scheduleDailyReminders,
  scheduleEveningMotivation,
  initializeSchedulers
};
