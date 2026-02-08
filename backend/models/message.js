import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    // For group chats or trainer-client conversations
    conversationId: {
      type: String,
      required: true,
    },
    // Optional metadata
    metadata: {
      fileName: String,
      fileSize: Number,
      fileType: String,
      imageUrl: String,
    },
  },
  { 
    timestamps: true,
    // Add index for better query performance
    index: { conversationId: 1, createdAt: -1 }
  }
);

// Create conversation ID from two user IDs (always in same order)
messageSchema.statics.createConversationId = function(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
};

export default mongoose.model("Message", messageSchema);