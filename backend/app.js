import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

// Load env vars synchronously — resolve all paths relative to this file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load base .env first (development defaults)
dotenv.config({ path: join(__dirname, ".env") });

// Load environment-specific file with override=true so it wins over base .env
const envFile = join(__dirname, `.env.${process.env.NODE_ENV || "development"}`);
dotenv.config({ path: envFile, override: true });

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
import sessionRequestRoutes from "./routes/sessionRequest.js";
import sessionSlotRoutes from "./routes/sessionSlot.js";
import workoutRoutes from "./routes/workout.js";

const app = express();
app.set('trust proxy', 1);
// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'https://lemon-sand-086fe0300.7.azurestaticapps.net'
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