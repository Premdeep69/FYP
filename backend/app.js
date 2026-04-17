import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import connectDB from "./config/db.js";

// Load env vars synchronously — resolve path relative to this file
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

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
import sessionRequestRoutes from "./routes/sessionRequest.js";
import workoutRoutes from "./routes/workout.js";

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Handle preflight requests
app.options("/*splat", cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
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
  { path: "/api/session-requests", handler: sessionRequestRoutes },
  { path: "/api/admin", handler: adminRoutes },
];

routes.forEach(route => app.use(route.path, route.handler));

// Health check
app.get("/test", (req, res) => {
  res.json({ message: "Smart Gym Fitness API is running!" });
});

export default app;