import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { User, Target, TrendingUp, Calendar, Bell } from "lucide-react";

const UserDashboard = () => {
  const userStats = [
    { label: "Workouts This Week", value: "5", icon: TrendingUp, color: "text-primary" },
    { label: "Current Streak", value: "12 days", icon: Target, color: "text-success" },
    { label: "Total Sessions", value: "48", icon: Calendar, color: "text-warning" },
  ];

  const weeklyGoals = [
    { name: "Workout Sessions", current: 5, target: 6, percentage: 83 },
    { name: "Active Minutes", current: 240, target: 300, percentage: 80 },
    { name: "Calories Burned", current: 1800, target: 2000, percentage: 90 },
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">My Dashboard</h1>
          <p className="text-lg text-muted-foreground">Track your progress and manage your profile</p>
        </div>

        {/* Profile Section */}
        <Card className="p-6 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-heading font-bold mb-2">John Doe</h2>
              <p className="text-muted-foreground mb-4">john.doe@email.com</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Edit Profile</Button>
                <Button variant="outline" size="sm">Settings</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {userStats.map((stat, index) => (
            <Card key={index} className="p-6">
              <stat.icon className={`w-10 h-10 ${stat.color} mb-3`} />
              <h3 className="text-3xl font-heading font-bold mb-1">{stat.value}</h3>
              <p className="text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Progress Tracker */}
          <Card className="p-6">
            <h3 className="text-xl font-heading font-bold mb-6">Weekly Progress</h3>
            <div className="space-y-6">
              {weeklyGoals.map((goal, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {goal.current} / {goal.target}
                    </span>
                  </div>
                  <Progress value={goal.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </Card>

          {/* Daily Reminders */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-bold">Daily Reminders</h3>
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              {[
                { label: "Morning Workout", time: "7:00 AM" },
                { label: "Water Intake", time: "Every 2 hours" },
                { label: "Evening Stretch", time: "8:00 PM" },
              ].map((reminder, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{reminder.label}</p>
                    <p className="text-sm text-muted-foreground">{reminder.time}</p>
                  </div>
                  <Switch />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-heading font-bold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { activity: "Completed Full Body Workout", date: "Today, 9:30 AM" },
              { activity: "Logged 350 calories burned", date: "Today, 9:45 AM" },
              { activity: "Connected with trainer Sarah Johnson", date: "Yesterday" },
              { activity: "Achieved 7-day workout streak", date: "2 days ago" },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">{item.activity}</p>
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;
