import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Exercises from "./pages/Exercises";
import WorkoutPlans from "./pages/WorkoutPlans";
import MyWorkouts from "./pages/MyWorkouts";
import WorkoutSession from "./pages/WorkoutSession";
import Trainers from "./pages/Trainers";
import BookTrainer from "./pages/BookTrainerNew";
import MyBookings from "./pages/MyBookings";
import TrainerManagement from "./pages/TrainerManagement";
import SessionSlots from "./pages/SessionSlots";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookingPayment from "./pages/BookingPayment";
import NotificationTest from "./pages/NotificationTest";
import AdminDashboard from "./pages/AdminDashboard";
import PendingApproval from "./pages/PendingApproval";
import BrowseSlots from "./pages/BrowseSlots";
import MyRequests from "./pages/MyRequests";
import AccountDeleted from "./pages/AccountDeleted";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout children={<Home />} />} />
              <Route path="/exercises" element={<Layout children={<Exercises />} />} />
              <Route path="/workout-plans" element={<Layout children={<WorkoutPlans />} />} />
              <Route path="/my-workouts" element={<Layout children={<MyWorkouts />} />} />
              <Route path="/workout-session" element={<Layout children={<WorkoutSession />} />} />
              <Route path="/trainers" element={<Layout children={<Trainers />} />} />
              <Route path="/book-trainer/:trainerId" element={<Layout children={<BookTrainer />} />} />
              <Route path="/my-bookings" element={<Layout children={<MyBookings />} />} />
              <Route path="/booking-payment" element={<Layout children={<BookingPayment />} />} />
              <Route path="/trainer-management" element={<Layout children={<TrainerManagement />} />} />
              <Route path="/session-slots" element={<Layout children={<SessionSlots />} />} />
              <Route path="/chat" element={<Layout children={<Chat />} />} />
              <Route path="/dashboard" element={<Layout children={<Dashboard />} />} />
              <Route path="/user-dashboard" element={<Layout children={<UserDashboard />} />} />
              <Route path="/trainer-dashboard" element={<Layout children={<TrainerDashboard />} />} />
              <Route path="/notification-test" element={<Layout children={<NotificationTest />} />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/browse-slots" element={<Layout children={<BrowseSlots />} />} />
              <Route path="/my-requests" element={<Layout children={<MyRequests />} />} />
              <Route path="/account-deleted" element={<AccountDeleted />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
