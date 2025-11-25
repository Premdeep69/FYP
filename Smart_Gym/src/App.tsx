import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Exercises from "./pages/Exercises";
import WorkoutPlans from "./pages/WorkoutPlans";
import Trainers from "./pages/Trainers";
import Chat from "./pages/Chat";
import VideoCall from "./pages/VideoCall";
import UserDashboard from "./pages/UserDashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout children={<Home />} />} />
          <Route path="/exercises" element={<Layout children={<Exercises />} />} />
          <Route path="/workout-plans" element={<Layout children={<WorkoutPlans />} />} />
          <Route path="/trainers" element={<Layout children={<Trainers />} />} />
          <Route path="/chat" element={<Layout children={<Chat />} />} />
          <Route path="/video-call" element={<Layout children={<VideoCall />} />} />
          <Route path="/user-dashboard" element={<Layout children={<UserDashboard />} />} />
          <Route path="/trainer-dashboard" element={<Layout children={<TrainerDashboard />} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
