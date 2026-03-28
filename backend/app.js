import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import chatRoutes from "./routes/chat.js";
import paymentRoutes from "./routes/payment.js";
import exerciseRoutes from "./routes/exercise.js";
import workoutRoutes from "./routes/workout.js";
import seedRoutes from "./routes/seed.js";
import notificationRoutes from "./routes/notification.js";

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

// Raw body parser for Stripe webhooks (must be before express.json())
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/seed", seedRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Smart Gym Fitness API is running!" });
});

export default app;