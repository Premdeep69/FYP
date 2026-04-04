import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/booking.js";
import chatRoutes from "./routes/chat.js";
import dashboardRoutes from "./routes/dashboard.js";
import exerciseRoutes from "./routes/exercise.js";
import notificationRoutes from "./routes/notification.js";
import paymentRoutes from "./routes/payment.js";
import seedRoutes from "./routes/seed.js";
import sessionSlotRoutes from "./routes/sessionSlot.js";
import workoutRoutes from "./routes/workout.js";

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle preflight requests
app.options("/*", cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Raw body parser for Stripe webhooks
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// JSON parser
app.use(express.json({ limit: "20mb" }));

// Routes
const routes = [
  { path: "/api/auth", handler: authRoutes },
  { path: "/api/dashboard", handler: dashboardRoutes },
  { path: "/api/chat", handler: chatRoutes },
  { path: "/api/payment", handler: paymentRoutes },
  { path: "/api/exercises", handler: exerciseRoutes },
  { path: "/api/workouts", handler: workoutRoutes },
  { path: "/api/seed", handler: seedRoutes },
  { path: "/api/notifications", handler: notificationRoutes },
  { path: "/api/bookings", handler: bookingRoutes },
  { path: "/api/session-slots", handler: sessionSlotRoutes },
  { path: "/api/admin", handler: adminRoutes },
];

routes.forEach(route => app.use(route.path, route.handler));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Smart Gym Fitness API is running!" });
});

export default app;