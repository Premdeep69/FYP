import jwt from "jsonwebtoken";
import User from "../models/users.js";
import Message from "../models/message.js";
import Conversation from "../models/conversation.js";
import notificationService from "../services/notificationService.js";

// Store active users and their socket connections
const activeUsers = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error: Invalid token"));
  }
};

// Handle socket connections
const handleConnection = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);
    
    // Store user connection
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      lastSeen: new Date(),
    });

    // Join user to their personal room
    socket.join(socket.userId);

    // Emit online status to all users
    socket.broadcast.emit("user_online", {
      userId: socket.userId,
      name: socket.user.name,
    });

    // Handle joining a conversation
    socket.on("join_conversation", async (data) => {
      try {
        const { conversationId } = data;
        socket.join(conversationId);
        
        // Update last seen for this conversation
        await Conversation.findOneAndUpdate(
          { 
            conversationId,
            "participants.userId": socket.userId 
          },
          { 
            "$set": { "participants.$.lastSeen": new Date() } 
          }
        );

        console.log(`User ${socket.user.name} joined conversation: ${conversationId}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content, messageType = "text", metadata } = data;
        
        // Create conversation ID
        const conversationId = Message.createConversationId(socket.userId, receiverId);
        
        // Create the message
        const message = await Message.create({
          senderId: socket.userId,
          receiverId,
          content,
          messageType,
          conversationId,
          metadata,
        });

        // Populate sender info
        await message.populate("senderId", "name email userType");

        // Update or create conversation
        await Conversation.findOneAndUpdate(
          { conversationId },
          {
            conversationId,
            $addToSet: {
              participants: [
                { userId: socket.userId },
                { userId: receiverId }
              ]
            },
            lastMessage: {
              content,
              senderId: socket.userId,
              timestamp: new Date(),
            },
            conversationType: "direct",
          },
          { upsert: true, new: true }
        );

        // Emit message to conversation participants
        io.to(conversationId).emit("new_message", {
          _id: message._id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          messageType: message.messageType,
          conversationId: message.conversationId,
          metadata: message.metadata,
          createdAt: message.createdAt,
          isRead: message.isRead,
        });

        // Send notification to receiver if they're online
        const receiverConnection = activeUsers.get(receiverId);
        if (receiverConnection) {
          io.to(receiverId).emit("message_notification", {
            senderId: socket.userId,
            senderName: socket.user.name,
            content: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
            conversationId,
          });
        }

        // Send FCM notification if receiver is offline or not in active chat
        if (!receiverConnection) {
          try {
            await notificationService.sendNewMessageNotification(
              receiverId,
              socket.user.name,
              content.substring(0, 100)
            );
          } catch (error) {
            console.error('Error sending message notification:', error);
          }
        }

        console.log(`Message sent from ${socket.user.name} to ${receiverId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle message read status
    socket.on("mark_as_read", async (data) => {
      try {
        const { messageId, conversationId } = data;
        
        await Message.findByIdAndUpdate(messageId, {
          isRead: true,
          readAt: new Date(),
        });

        // Notify sender that message was read
        socket.to(conversationId).emit("message_read", {
          messageId,
          readBy: socket.userId,
          readAt: new Date(),
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to mark message as read" });
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit("user_typing", {
        userId: socket.userId,
        userName: socket.user.name,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit("user_typing", {
        userId: socket.userId,
        userName: socket.user.name,
        isTyping: false,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${socket.user.name} disconnected`);
      
      // Remove from active users
      activeUsers.delete(socket.userId);
      
      // Emit offline status
      socket.broadcast.emit("user_offline", {
        userId: socket.userId,
        name: socket.user.name,
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });
};

// Get active users (for API endpoint)
const getActiveUsers = () => {
  return Array.from(activeUsers.values()).map(connection => ({
    userId: connection.user._id,
    name: connection.user.name,
    userType: connection.user.userType,
    lastSeen: connection.lastSeen,
  }));
};

export { handleConnection, getActiveUsers };