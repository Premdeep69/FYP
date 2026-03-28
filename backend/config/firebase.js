import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// and save it as firebase-service-account.json in the config folder
let firebaseApp;

try {
  // Check if service account file exists
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  if (serviceAccount) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase service account not configured. Push notifications will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
}

// Send notification to a single device
export const sendNotification = async (fcmToken, notification, data = {}) => {
  if (!firebaseApp) {
    console.warn('Firebase not initialized. Skipping notification.');
    return null;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined
      },
      data: {
        ...data,
        clickAction: data.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        timestamp: new Date().toISOString()
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'workout_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: [200, 100, 200]
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Send notification to multiple devices
export const sendMulticastNotification = async (fcmTokens, notification, data = {}) => {
  if (!firebaseApp || !fcmTokens || fcmTokens.length === 0) {
    console.warn('Firebase not initialized or no tokens provided. Skipping notification.');
    return null;
  }

  try {
    const message = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'workout_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications`);
    return response;
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    throw error;
  }
};

// Send notification to a topic
export const sendTopicNotification = async (topic, notification, data = {}) => {
  if (!firebaseApp) {
    console.warn('Firebase not initialized. Skipping notification.');
    return null;
  }

  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent topic notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending topic notification:', error);
    throw error;
  }
};

// Subscribe user to topic
export const subscribeToTopic = async (fcmTokens, topic) => {
  if (!firebaseApp) {
    console.warn('Firebase not initialized. Skipping subscription.');
    return null;
  }

  try {
    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    console.log(`Successfully subscribed to topic ${topic}:`, response);
    return response;
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw error;
  }
};

// Unsubscribe user from topic
export const unsubscribeFromTopic = async (fcmTokens, topic) => {
  if (!firebaseApp) {
    console.warn('Firebase not initialized. Skipping unsubscription.');
    return null;
  }

  try {
    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    console.log(`Successfully unsubscribed from topic ${topic}:`, response);
    return response;
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    throw error;
  }
};

export default admin;
