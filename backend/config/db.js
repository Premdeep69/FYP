import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      ssl: true,
    });
    console.log("MongoDB connected", process.env.MONGO_URI);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
