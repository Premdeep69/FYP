import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Search, MoreVertical, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiService } from "@/services/api";
import { socketService, Message, Conversation, User } from "@/services/socket";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Get trainer info from navigation state
  const { trainerId, trainerName } = (location.state as any) || {};

  useEffect(() => {
    if (user) {
      loadConversations();
      loadAvailableUsers();
      setupSocketListeners();
    }

    return () => {
      // Cleanup socket listeners
      socketService.off('new_message');
      socketService.off('user_typing');
      socketService.off('message_notification');
    };
  }, [user]);

  // Handle trainer selection from navigation
  useEffect(() => {
    if (trainerId && conversations.length > 0) {
      // Check if conversation already exists
      const existingConv = conversations.find(
        conv => conv.participant._id === trainerId
      );

      if (existingConv) {
        selectConversation(existingConv);
      } else {
        // Show user list with only the selected trainer
        setShowUserList(true);
      }
    }
  }, [trainerId, conversations]);

  // Auto-start conversation when trainer is loaded
  useEffect(() => {
    if (trainerId && showUserList && availableUsers.length > 0) {
      const trainer = availableUsers.find(u => u._id === trainerId);
      if (trainer) {
        // Automatically start conversation with the trainer
        startNewConversation(trainerId);
      }
    }
  }, [trainerId, showUserList, availableUsers]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocketListeners = () => {
    // Listen for new messages
    socketService.onNewMessage((message: Message) => {
      // Ignore messages sent by the current user — they already see it in the UI
      const currentUserId = user?._id || (user as any)?.id;
      if (message.senderId?._id === currentUserId || message.senderId === currentUserId) {
        loadConversations();
        return;
      }

      const isActiveChat = activeConversation && message.conversationId === activeConversation.conversationId;
      
      if (isActiveChat) {
        setMessages(prev => [...prev, message]);
        // Mark as read if conversation is active
        socketService.markAsRead(message._id, message.conversationId);
      } else {
        // Add notification only for the recipient, for messages in other conversations
        const senderName = message.senderId?.name || 'Someone';
        addNotification({
          type: 'new_message',
          title: `💬 New message from ${senderName}`,
          message: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
          actionUrl: '/chat',
          data: { conversationId: message.conversationId, messageId: message._id }
        });
      }
      
      // Update conversation list
      loadConversations();
    });

    // Listen for typing indicators
    socketService.onUserTyping((data) => {
      if (activeConversation && data.userId !== (user?._id || user?.id)) {
        setTyping(prev => ({
          ...prev,
          [data.userId]: data.isTyping
        }));
      }
    });

    // Listen for message notifications (only fires for the recipient)
    socketService.onMessageNotification((notification) => {
      const currentUserId = user?._id || (user as any)?.id;
      // Skip if this notification is about our own message
      if (notification.senderId === currentUserId) return;

      if (!activeConversation || notification.conversationId !== activeConversation.conversationId) {
        toast({
          title: `New message from ${notification.senderName}`,
          description: notification.content,
        });
        
        // Add to notification center
        addNotification({
          type: 'new_message',
          title: `💬 ${notification.senderName}`,
          message: notification.content,
          actionUrl: '/chat',
          data: { conversationId: notification.conversationId }
        });
      }
    });

    // Listen for user online/offline status
    socketService.onUserOnline((data) => {
      // Update user list with online status
      setAvailableUsers(prev => 
        prev.map(u => u._id === data.userId ? { ...u, isOnline: true } : u)
      );
    });

    socketService.onUserOffline((data) => {
      setAvailableUsers(prev => 
        prev.map(u => u._id === data.userId ? { ...u, isOnline: false } : u)
      );
    });
  };

  const loadConversations = async () => {
    try {
      const data = await apiService.getConversations();
      setConversations(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const users = await apiService.getAvailableUsers();
      setAvailableUsers(users);
    } catch (error: any) {
      console.error("Failed to load available users:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await apiService.getMessages(conversationId);
      setMessages(data);
      socketService.joinConversation(conversationId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    loadMessages(conversation.conversationId);
    setShowUserList(false);
  };

  const startNewConversation = async (userId: string) => {
    try {
      const conversation = await apiService.startConversation(userId);
      await loadConversations();
      
      // Find and select the new conversation
      setTimeout(() => {
        const newConv = conversations.find(c => 
          c.participant._id === userId || 
          c.conversationId === conversation.conversationId
        );
        if (newConv) {
          selectConversation(newConv);
        } else {
          // If conversation not found in list, create a temporary one
          const tempConv: Conversation = {
            conversationId: conversation.conversationId,
            participant: {
              _id: userId,
              name: trainerName || 'User',
              email: '',
              userType: 'trainer'
            },
            unreadCount: 0,
            updatedAt: new Date().toISOString()
          };
          setActiveConversation(tempConv);
          loadMessages(conversation.conversationId);
        }
      }, 500);
      
      setShowUserList(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;

    socketService.sendMessage(
      activeConversation.participant._id,
      newMessage.trim()
    );

    setNewMessage("");
    
    // Stop typing indicator
    socketService.stopTyping(activeConversation.conversationId);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (!activeConversation) return;

    // Start typing indicator
    socketService.startTyping(activeConversation.conversationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(activeConversation.conversationId);
    }, 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Chat</h1>
          <p className="text-lg text-muted-foreground">
            {user?.userType === 'user' 
              ? 'Connect with trainers' 
              : 'Connect with your clients'}
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold">Conversations</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowUserList(!showUserList)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showUserList ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {user?.userType === 'user' ? 'Available Trainers' : 'Your Clients'}
                </h4>
                <ScrollArea className="h-[500px]">
                  {availableUsers
                    .filter(availableUser => {
                      // If trainerId is provided (from Trainers page), show only that trainer
                      if (trainerId) {
                        return availableUser._id === trainerId;
                      }
                      // For users, show trainers; for trainers, show users
                      if (user?.userType === 'user') {
                        return availableUser.userType === 'trainer';
                      } else {
                        return availableUser.userType === 'user';
                      }
                    })
                    .map((availableUser) => (
                      <div
                        key={availableUser._id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => startNewConversation(availableUser._id)}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{getInitials(availableUser.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{availableUser.name}</p>
                            {availableUser.isOnline && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground capitalize">
                            {availableUser.userType}
                          </p>
                          {availableUser.specializations && availableUser.specializations.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {availableUser.specializations.slice(0, 2).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  {trainerId && availableUsers.filter(u => u._id === trainerId).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading trainer...</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                {conversations.length > 0 ? (
                  conversations
                    .filter(conversation => conversation.participant !== null)
                    .map((conversation) => (
                      <div
                        key={conversation.conversationId}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted ${
                          activeConversation?.conversationId === conversation.conversationId
                            ? "bg-muted"
                            : ""
                        }`}
                        onClick={() => selectConversation(conversation)}
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>
                            {getInitials(conversation.participant?.name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {conversation.participant?.name || 'Unknown User'}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(conversation.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No conversations yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUserList(true)}
                    >
                      Start a conversation
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-3 flex flex-col">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {getInitials(activeConversation.participant?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{activeConversation.participant?.name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {activeConversation.participant?.userType || 'user'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${
                          message.senderId._id === (user?._id || user?.id) ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.senderId._id === (user?._id || user?.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.senderId._id === (user?._id || user?.id)
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing indicator */}
                    {Object.values(typing).some(Boolean) && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Select a conversation to start chatting</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowUserList(true)}
                  >
                    Start New Conversation
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;