import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, Star, Clock } from "lucide-react";

const TrainerDashboard = () => {
  const stats = [
    { label: "Active Clients", value: "24", icon: Users, color: "text-primary" },
    { label: "This Month", value: "$3,200", icon: DollarSign, color: "text-success" },
    { label: "Avg Rating", value: "4.9", icon: Star, color: "text-warning" },
    { label: "Sessions Today", value: "6", icon: Clock, color: "text-secondary" },
  ];

  const upcomingSessions = [
    { client: "John Doe", time: "2:00 PM", type: "Strength Training", status: "confirmed" },
    { client: "Jane Smith", time: "3:30 PM", type: "HIIT", status: "confirmed" },
    { client: "Mike Johnson", time: "5:00 PM", type: "Personal Training", status: "pending" },
    { client: "Sarah Williams", time: "6:30 PM", type: "Yoga", status: "confirmed" },
  ];

  const recentClients = [
    { name: "Emily Brown", plan: "Weight Loss", progress: 85, lastSession: "Today" },
    { name: "David Lee", plan: "Muscle Gain", progress: 70, lastSession: "Yesterday" },
    { name: "Lisa Chen", plan: "General Fitness", progress: 60, lastSession: "2 days ago" },
  ];

  const getStatusColor = (status: string) => {
    return status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning";
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Trainer Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage your clients and schedule</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
              <h3 className="text-3xl font-heading font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-bold">Today's Schedule</h3>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {upcomingSessions.map((session, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{session.client}</h4>
                      <p className="text-sm text-muted-foreground">{session.type}</p>
                    </div>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {session.time}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Clients */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-bold">Active Clients</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="space-y-4">
              {recentClients.map((client, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{client.name}</h4>
                      <p className="text-sm text-muted-foreground">{client.plan}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{client.lastSession}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{client.progress}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${client.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Earnings Summary */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-heading font-bold mb-6">Earnings Summary</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { period: "Today", amount: "$450" },
              { period: "This Week", amount: "$1,800" },
              { period: "This Month", amount: "$3,200" },
              { period: "Total", amount: "$28,500" },
            ].map((earning, index) => (
              <div key={index} className="text-center">
                <p className="text-sm text-muted-foreground mb-1">{earning.period}</p>
                <p className="text-2xl font-heading font-bold">{earning.amount}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Profile Management */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-heading font-bold mb-4">Profile Management</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Button variant="outline">Update Availability</Button>
            <Button variant="outline">Edit Services</Button>
            <Button variant="outline">Manage Certifications</Button>
            <Button variant="outline">View Reviews</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TrainerDashboard;
