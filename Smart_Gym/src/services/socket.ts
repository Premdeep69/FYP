import { io, Socket } from 'socket.io-client';

export interface Message {
  _id: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
    userType: string;
  };
  receiverId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  conversationId: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    imageUrl?: string;
  };
}

export interface Conversation {
  conversationId: string;
  participant: {
    _id: string;
    name: string;
    email: string;
    userType: string;
  } | null;
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  userType: string;
  specializations?: string[];
  rating?: number;
  isOnline?: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    
    // Disconnect existing connection if any
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    
    this.socket = io('http://localhost:5000', {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      
      // If authentication error, don't retry
      if (error.message.includes('Authentication error')) {
        console.log('Authentication failed. Please log in again.');
        this.disconnect();
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join a conversation room
  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  // Send a message
  sendMessage(receiverId: string, content: string, messageType: string = 'text', metadata?: any) {
    if (this.socket) {
      this.socket.emit('send_message', {
        receiverId,
        content,
        messageType,
        metadata,
      });
    }
  }

  // Mark message as read
  markAsRead(messageId: string, conversationId: string) {
    if (this.socket) {
      this.socket.emit('mark_as_read', { messageId, conversationId });
    }
  }

  // Typing indicators
  startTyping(conversationId: string) {
    if (this.socket) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  stopTyping(conversationId: string) {
    if (this.socket) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  // Event listeners
  onNewMessage(callback: (message: Message) => void) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onMessageNotification(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.on('message_notification', callback);
    }
  }

  onUserTyping(callback: (data: { userId: string; userName: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserOnline(callback: (data: { userId: string; name: string }) => void) {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  onUserOffline(callback: (data: { userId: string; name: string }) => void) {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }

  onMessageRead(callback: (data: { messageId: string; readBy: string; readAt: string }) => void) {
    if (this.socket) {
      this.socket.on('message_read', callback);
    }
  }

  onError(callback: (error: any) => void) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove event listeners
  off(event: string, callback?: Function) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();