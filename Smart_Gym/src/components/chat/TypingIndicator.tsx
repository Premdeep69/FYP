import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  userName: string;
  userInitials: string;
}

const TypingIndicator = ({ userName, userInitials }: TypingIndicatorProps) => {
  return (
    <div className="flex items-end gap-2 mb-4">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground mb-1 px-1">
          {userName}
        </span>
        
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div 
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div 
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div 
                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span className="text-xs text-muted-foreground ml-2">typing...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;