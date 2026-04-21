import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/users.js";

if (process.env.NODE_ENV !== "production") {
  import('dotenv').then(dotenv => dotenv.config());
}


const seedAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: "admin@smartgym.com" });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("Admin@123", salt);

  await User.create({
    name: "Admin",
    email: "admin@smartgym.com",
    password: hashedPassword,
    userType: "admin",
    isActive: true,
    isVerified: true,
    emailVerified: true,   // admin bypasses email verification
  });

  console.log("Admin created: admin@smartgym.com / Admin@123");
  process.exit(0);
};

seedAdmin().catch((err) => { console.error(err); process.exit(1); });
