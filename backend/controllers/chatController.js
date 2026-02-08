import Message from "../models/message.js";
import Conversation from "../models/conversation.js";
import User from "../models/users.js";
import { getActiveUsers } from "../socket/socketHandler.js";

// Get user's conversations
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      "participants.userId": userId,
      isActive: true,
    })
    .populate("participants.userId", "name email userType")
    .populate("lastMessage.senderId", "name")
    .sort({ updatedAt: -1 });

    // Format conversations for frontend
    const formattedConversations = await Promise.all(conversations.map(async (conv) => {
      const otherParticipant = conv.participants.find(
        p => p.userId._id.toString() !== userId.toString()
      );

      const unreadCount = await Message.countDocuments({
        conversationId: conv.conversationId,
        receiverId: userId,
        isRead: false,
      });

      return {
        conversationId: conv.conversationId,
        participant: otherParticipant ? {
          _id: otherParticipant.userId._id,
          name: otherParticipant.userId.name,
          email: otherParticipant.userId.email,
          userType: otherParticipant.userId.userType,
        } : null,
        lastMessage: conv.lastMessage,
        updatedAt: conv.updatedAt,
        unreadCount,
      };
    }));

    res.json(formattedConversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is part of this conversation
    const conversation = await Conversation.findOne({
      conversationId,
      "participants.userId": userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Access denied to this conversation" });
    }

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name email userType")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Start a new conversation
export const startConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { receiverId } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const conversationId = Message.createConversationId(userId.toString(), receiverId);

    // Create or get existing conversation
    let conversation = await Conversation.findOneAndUpdate(
      { conversationId },
      {
        conversationId,
        $addToSet: {
          participants: [
            { userId: userId },
            { userId: receiverId }
          ]
        },
        conversationType: "direct",
        isActive: true,
      },
      { upsert: true, new: true }
    ).populate("participants.userId", "name email userType");

    res.json({
      conversationId: conversation.conversationId,
      participant: {
        _id: receiver._id,
        name: receiver.name,
        email: receiver.email,
        userType: receiver.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available users to chat with
export const getAvailableUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.userType;

    let query = { _id: { $ne: userId }, isActive: true };

    // If user is a regular user, show trainers
    // If user is a trainer, show all users
    if (userType === "user") {
      query.userType = "trainer";
    }

    const users = await User.find(query)
      .select("name email userType trainerProfile.specializations trainerProfile.rating")
      .limit(20);

    // Add online status
    const activeUsersList = getActiveUsers();
    const activeUserIds = new Set(activeUsersList.map(u => u.userId.toString()));

    const usersWithStatus = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      specializations: user.trainerProfile?.specializations || [],
      rating: user.trainerProfile?.rating?.average || 0,
      isOnline: activeUserIds.has(user._id.toString()),
    }));

    res.json(usersWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get online users
export const getOnlineUsers = async (req, res) => {
  try {
    const activeUsersList = getActiveUsers();
    res.json(activeUsersList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};