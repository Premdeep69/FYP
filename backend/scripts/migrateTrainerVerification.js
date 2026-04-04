import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/users.js";

if (process.env.NODE_ENV !== "production") {
  import('dotenv').then(dotenv => dotenv.config());
}


const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Find all trainers missing a trainerVerification.status
  const result = await User.updateMany(
    {
      userType: "trainer",
      $or: [
        { "trainerVerification.status": { $exists: false } },
        { trainerVerification: { $exists: false } },
      ],
    },
    {
      $set: {
        "trainerVerification.status": "pending",
        "trainerVerification.submittedAt": new Date(),
        isVerified: false,
      },
    }
  );

  console.log(`Migrated ${result.modifiedCount} trainer(s) to pending status`);
  process.exit(0);
};

migrate().catch((err) => { console.error(err); process.exit(1); });
