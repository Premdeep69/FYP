import jwt from "jsonwebtoken";
import User from "../models/users.js";
import Message from "../models/message.js";
import Conversation from "../models/conversation.js";
import notificationService from "../services/notificationService.js";
import syncService from "../services/syncService.js";

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

    if (user.isDeleted) {
      return next(new Error("Authentication error: Account has been deleted"));
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

  // Bridge syncService slot events → Socket.IO broadcast
  syncService.on('slot:created',   (data) => io.emit('slot:created',   data));
  syncService.on('slot:updated',   (data) => io.emit('slot:updated',   data));
  syncService.on('slot:cancelled', (data) => io.emit('slot:cancelled', data));
  syncService.on('slot:deleted',   (data) => io.emit('slot:deleted',   data));

  // Bridge session request events — route to specific users
  syncService.on('sessionRequest:created', ({ request }) => {
    io.to(request.trainerId._id?.toString() || request.trainerId?.toString()).emit('sessionRequest:new', { request });
  });
  syncService.on('sessionRequest:awaiting_payment', ({ request, clientSecret, sessionPrice }) => {
    // Notify the user that trainer accepted and payment is needed
    io.to(request.userId._id?.toString() || request.userId?.toString()).emit('sessionRequest:awaiting_payment', { request, clientSecret, sessionPrice });
  });
  syncService.on('sessionRequest:accepted', ({ request, slot }) => {
    io.to(request.userId._id?.toString() || request.userId?.toString()).emit('sessionRequest:accepted', { request, slot });
  });
  syncService.on('sessionRequest:confirmed', ({ request, slot, booking }) => {
    // Notify both trainer and user
    const userId = request.userId._id?.toString() || request.userId?.toString();
    const trainerId = request.trainerId._id?.toString() || request.trainerId?.toString();
    io.to(userId).emit('sessionRequest:confirmed', { request, slot, booking });
    io.to(trainerId).emit('sessionRequest:confirmed', { request, slot, booking });
  });
  syncService.on('sessionRequest:rejected', ({ request }) => {
    io.to(request.userId._id?.toString() || request.userId?.toString()).emit('sessionRequest:rejected', { request });
  });
  syncService.on('sessionRequest:expired', ({ request }) => {
    const userId = request.userId._id?.toString() || request.userId?.toString();
    const trainerId = request.trainerId._id?.toString() || request.trainerId?.toString();
    io.to(userId).emit('sessionRequest:expired', { request });
    io.to(trainerId).emit('sessionRequest:expired', { request });
  });
  syncService.on('sessionRequest:payment_failed', ({ request }) => {
    io.to(request.userId._id?.toString() || request.userId?.toString()).emit('sessionRequest:payment_failed', { request });
  });

  // Slot booking confirmed after payment — notify trainer
  syncService.on('booking:confirmed', (data) => {
    const trainerId = data.trainerId?.toString?.() || data.trainerId;
    if (trainerId) {
      io.to(trainerId).emit('booking:new_confirmed', data);
    }
  });

  // Booking cancelled by user — notify trainer
  syncService.on('booking:cancelled_notify_trainer', ({ trainerId, message }) => {
    if (trainerId) {
      io.to(trainerId).emit('booking:cancelled_by_user', { message });
    }
  });

  // Booking cancelled by trainer — notify client
  syncService.on('booking:cancelled_notify_client', ({ clientId, message }) => {
    if (clientId) {
      io.to(clientId).emit('booking:cancelled_by_trainer', { message });
    }
  });

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
            $set: {
              conversationId,
              lastMessage: {
                content,
                senderId: socket.userId,
                timestamp: new Date(),
              },
              conversationType: "direct",
            },
            $addToSet: { participants: { userId: socket.userId } },
          },
          { upsert: true, new: true }
        );
        // Ensure receiver is also in participants
        await Conversation.findOneAndUpdate(
          { conversationId },
          { $addToSet: { participants: { userId: receiverId } } }
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