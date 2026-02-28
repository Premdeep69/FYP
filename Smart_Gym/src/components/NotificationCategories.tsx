import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Dumbbell, Trophy, Calendar, CreditCard, Bell, Filter } from "lucide-react";

interface NotificationCategoriesProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categoryCounts: {
    all: number;
    chat: number;
    workout: number;
    achievement: number;
    reminder: number;
    payment: number;
    system: number;
  };
}

const NotificationCategories = ({ 
  selectedCategory, 
  onCategoryChange, 
  categoryCounts 
}: NotificationCategoriesProps) => {
  const categories = [
    { id: 'all', label: 'All', icon: Filter, count: categoryCounts.all },
    { id: 'chat', label: 'Chat', icon: MessageSquare, count: categoryCounts.chat },
    { id: 'workout', label: 'Workouts', icon: Dumbbell, count: categoryCounts.workout },
    { id: 'achievement', label: 'Achievements', icon: Trophy, count: categoryCounts.achievement },
    { id: 'reminder', label: 'Reminders', icon: Calendar, count: categoryCounts.reminder },
    { id: 'payment', label: 'Payments', icon: CreditCard, count: categoryCounts.payment },
    { id: 'system', label: 'System', icon: Bell, count: categoryCounts.system },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 border-b">
      {categories.map((category) => {
        const Icon = category.icon;
        const isActive = selectedCategory === category.id;
        
        return (
          <Button
            key={category.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Icon className="w-4 h-4" />
            {category.label}
            {category.count > 0 && (
              <Badge 
                variant={isActive ? "secondary" : "default"}
                className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 px-1.5"
              >
                {category.count > 99 ? '99+' : category.count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default NotificationCategories;
