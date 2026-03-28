import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { User } from "@/services/socket";

interface UserListItemProps {
  user: User;
  onClick: () => void;
}

const UserListItem = ({ user, onClick }: UserListItemProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      onClick={onClick}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="text-sm font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        {user.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>

      {/* User details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate text-sm">
            {user.name}
          </h4>
          {user.isOnline ? (
            <Badge variant="secondary" className="text-xs">
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Offline
            </Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground capitalize mb-1">
          {user.userType}
        </p>

        {/* Trainer-specific info */}
        {user.userType === 'trainer' && (
          <div className="space-y-1">
            {user.rating && user.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">
                  {user.rating.toFixed(1)}
                </span>
              </div>
            )}
            {user.specializations && user.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {user.specializations.slice(0, 2).map((spec, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {spec}
                  </Badge>
                ))}
                {user.specializations.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.specializations.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserListItem;