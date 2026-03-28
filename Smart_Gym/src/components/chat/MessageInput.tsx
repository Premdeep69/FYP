import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Paperclip, Mic } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput = ({ 
  value, 
  onChange, 
  onSend, 
  onTyping, 
  onStopTyping, 
  disabled = false,
  placeholder = "Type a message..." 
}: MessageInputProps) => {
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    
    // Handle typing indicators
    if (newValue.trim() && !isTyping) {
      setIsTyping(true);
      onTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onStopTyping();
    }, 2000);

    // Stop typing immediately if input is empty
    if (!newValue.trim() && isTyping) {
      setIsTyping(false);
      onStopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
        setIsTyping(false);
        onStopTyping();
      }
    }
  };

  const handleSend = () => {
    if (value.trim()) {
      onSend();
      setIsTyping(false);
      onStopTyping();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <Button
          size="sm"
          variant="ghost"
          className="flex-shrink-0 h-10 w-10 p-0"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] resize-none pr-12 py-2"
            rows={1}
          />
          
          {/* Emoji button */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            disabled={disabled}
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>

        {/* Send/Voice button */}
        {value.trim() ? (
          <Button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="flex-shrink-0 h-10 w-10 p-0 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="flex-shrink-0 h-10 w-10 p-0"
            disabled={disabled}
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;