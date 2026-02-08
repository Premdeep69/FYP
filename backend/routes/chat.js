import express from "express";
import {
  getConversations,
  getMessages,
  startConversation,
  getAvailableUsers,
  getOnlineUsers,
} from "../controllers/chatController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All chat routes require authentication
router.use(protect);

// Get user's conversations
router.get("/conversations", getConversations);

// Get messages for a specific conversation
router.get("/conversations/:conversationId/messages", getMessages);

// Start a new conversation
router.post("/conversations", startConversation);

// Get available users to chat with
router.get("/users", getAvailableUsers);

// Get currently online users
router.get("/online-users", getOnlineUsers);

export default router;