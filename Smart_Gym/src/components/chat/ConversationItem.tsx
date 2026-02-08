import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Conversation } from "@/services/socket";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isOnline?: boolean;
  onClick: () => void;
}

const ConversationItem = ({ conversation, isActive, isOnline, onClick }: ConversationItemProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 40) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
        isActive ? "bg-primary/10 border border-primary/20" : ""
      }`}
      onClick={onClick}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="text-sm font-medium">
            {getInitials(conversation.participant.name)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>

      {/* Conversation details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium truncate text-sm">
            {conversation.participant.name}
          </h4>
          <div className="flex items-center gap-2">
            {conversation.lastMessage && (
              <span className="text-xs text-muted-foreground">
                {formatTime(conversation.updatedAt)}
              </span>
            )}
            {conversation.unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs min-w-[20px] h-5 flex items-center justify-center">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground capitalize mb-1">
            {conversation.participant.userType}
          </p>
        </div>

        {conversation.lastMessage && (
          <p className="text-sm text-muted-foreground truncate">
            {truncateMessage(conversation.lastMessage.content)}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConversationItem;