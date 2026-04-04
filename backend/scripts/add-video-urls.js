import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exercise from '../models/exercise.js';

if (process.env.NODE_ENV !== "production") {
  import('dotenv').then(dotenv => dotenv.config());
}


const videoUrls = {
  'Push-ups': 'https://www.youtube.com/watch?v=IODxDxX7oi4',
  'Squats': 'https://www.youtube.com/watch?v=aclHkVaku9U',
  'Deadlifts': 'https://www.youtube.com/watch?v=op9kVnSso6Q',
  'Plank': 'https://www.youtube.com/watch?v=pSHjTRCQxIw',
  'Burpees': 'https://www.youtube.com/watch?v=TU8QYVW0gDU',
  'Mountain Climbers': 'https://www.youtube.com/watch?v=nmwgirgXLYM'
};

const addVideoUrls = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const [exerciseName, videoUrl] of Object.entries(videoUrls)) {
      const result = await Exercise.updateOne(
        { name: exerciseName },
        { $set: { videoUrl } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✓ Updated ${exerciseName} with video URL`);
      } else {
        console.log(`- ${exerciseName} not found or already has video URL`);
      }
    }

    console.log('\nVideo URLs added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addVideoUrls();
