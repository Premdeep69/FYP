import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/users.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Register FCM token
router.post('/register-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    await User.findByIdAndUpdate(req.user.userId, {
      fcmToken: token
    });

    res.json({ message: 'FCM token registered successfully' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ message: 'Failed to register FCM token' });
  }
});

// Update notification preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const { workoutReminders, streakMilestones, goalAchievements, newMessages } = req.body;

    await User.findByIdAndUpdate(req.user.userId, {
      preferences: {
        workoutReminders: workoutReminders !== undefined ? workoutReminders : true,
        streakMilestones: streakMilestones !== undefined ? streakMilestones : true,
        goalAchievements: goalAchievements !== undefined ? goalAchievements : true,
        newMessages: newMessages !== undefined ? newMessages : true
      }
    });

    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
});

// Get notification preferences
router.get('/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('preferences');
    
    res.json({
      preferences: user.preferences || {
        workoutReminders: true,
        streakMilestones: true,
        goalAchievements: true,
        newMessages: true
      }
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ message: 'Failed to fetch preferences' });
  }
});

// Test notification endpoint (for development)
router.post('/test-reminder', protect, async (req, res) => {
  try {
    await notificationService.sendWorkoutReminder(req.user.userId);
    res.json({ message: 'Test reminder sent successfully' });
  } catch (error) {
    console.error('Error sending test reminder:', error);
    res.status(500).json({ message: 'Failed to send test reminder' });
  }
});

// Manually trigger daily reminders (admin only - for testing)
router.post('/trigger-daily-reminders', protect, async (req, res) => {
  try {
    // In production, you might want to add admin check here
    await notificationService.scheduleDailyWorkoutReminders();
    res.json({ message: 'Daily reminders triggered successfully' });
  } catch (error) {
    console.error('Error triggering daily reminders:', error);
    res.status(500).json({ message: 'Failed to trigger daily reminders' });
  }
});

export default router;
