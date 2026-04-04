import mongoose from 'mongoose';
import Exercise from './models/exercise.js';

if (process.env.NODE_ENV !== "production") {
  import('dotenv').then(dotenv => dotenv.config());
}


const testVideoUrls = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const exercises = await Exercise.find({ isActive: true })
      .select('name videoUrl')
      .limit(10);

    console.log('Exercises with video URLs:');
    console.log('='.repeat(50));
    
    exercises.forEach(exercise => {
      console.log(`\n${exercise.name}`);
      console.log(`  Video URL: ${exercise.videoUrl || 'NOT SET'}`);
      console.log(`  Has Video: ${exercise.videoUrl ? '✓ YES' : '✗ NO'}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`\nTotal exercises checked: ${exercises.length}`);
    console.log(`Exercises with videos: ${exercises.filter(e => e.videoUrl).length}`);
    console.log(`Exercises without videos: ${exercises.filter(e => !e.videoUrl).length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testVideoUrls();
