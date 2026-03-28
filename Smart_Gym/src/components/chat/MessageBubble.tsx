import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCheck, Clock } from "lucide-react";
import { Message } from "@/services/socket";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTime?: boolean;
}

const MessageBubble = ({ message, isOwn, showAvatar = true, showTime = true }: MessageBubbleProps) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getMessageStatus = () => {
    if (isOwn) {
      if (message.isRead) {
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      } else {
        return <Check className="w-3 h-3 text-muted-foreground" />;
      }
    }
    return null;
  };

  return (
    <div className={`flex items-end gap-2 mb-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(message.senderId.name)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name (only for received messages) */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.senderId.name}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`relative rounded-2xl px-4 py-2 max-w-full break-words ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          }`}
        >
          {/* Message content */}
          <div className="text-sm leading-relaxed">
            {message.content}
          </div>

          {/* Message metadata */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {showTime && (
              <span className={`text-xs ${
                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {formatTime(message.createdAt)}
              </span>
            )}
            {getMessageStatus()}
          </div>
        </div>
      </div>

      {/* Spacer for own messages to maintain alignment */}
      {isOwn && <div className="w-8" />}
    </div>
  );
};

export default MessageBubble;