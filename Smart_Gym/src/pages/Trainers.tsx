import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Trainer {
  id: number;
  name: string;
  specialty: string[];
  rating: number;
  price: number;
  experience: string;
  clients: number;
  bio: string;
}

const Trainers = () => {
  const { toast } = useToast();

  const trainers: Trainer[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      specialty: ["Weight Loss", "HIIT", "Nutrition"],
      rating: 4.9,
      price: 50,
      experience: "8 years",
      clients: 150,
      bio: "Certified personal trainer specializing in transformation programs",
    },
    {
      id: 2,
      name: "Mike Chen",
      specialty: ["Strength Training", "Powerlifting", "Athletic Performance"],
      rating: 4.8,
      price: 60,
      experience: "10 years",
      clients: 200,
      bio: "Former competitive powerlifter with a passion for building strength",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      specialty: ["Yoga", "Flexibility", "Mindfulness"],
      rating: 5.0,
      price: 45,
      experience: "6 years",
      clients: 120,
      bio: "Holistic approach to fitness combining physical and mental wellness",
    },
    {
      id: 4,
      name: "David Thompson",
      specialty: ["Bodybuilding", "Hypertrophy", "Contest Prep"],
      rating: 4.9,
      price: 70,
      experience: "12 years",
      clients: 180,
      bio: "Professional bodybuilder and coach for competitive athletes",
    },
    {
      id: 5,
      name: "Lisa Martinez",
      specialty: ["CrossFit", "Functional Fitness", "Sports Performance"],
      rating: 4.7,
      price: 55,
      experience: "7 years",
      clients: 140,
      bio: "CrossFit Level 3 trainer focused on functional movement",
    },
    {
      id: 6,
      name: "James Wilson",
      specialty: ["Rehabilitation", "Injury Prevention", "Senior Fitness"],
      rating: 4.9,
      price: 65,
      experience: "15 years",
      clients: 220,
      bio: "Physical therapist turned trainer specializing in safe, effective training",
    },
  ];

  const handleChat = (trainerName: string) => {
    toast({
      title: "Starting Chat",
      description: `Connecting you with ${trainerName}...`,
    });
  };

  const handleVideoCall = (trainerName: string) => {
    toast({
      title: "Booking Video Call",
      description: `Setting up a video consultation with ${trainerName}...`,
    });
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Expert Trainers</h1>
          <p className="text-lg text-muted-foreground">
            Connect with certified trainers who can help you achieve your goals
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((trainer) => (
            <Card key={trainer.id} className="p-6 card-hover">
              <div className="mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-4" />
                <h3 className="text-xl font-heading font-bold mb-1">{trainer.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-medium">{trainer.rating}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {trainer.clients} clients
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{trainer.bio}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {trainer.specialty.map((spec, index) => (
                  <Badge key={index} variant="outline">
                    {spec}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <div className="text-sm text-muted-foreground">Experience</div>
                  <div className="font-medium">{trainer.experience}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="font-bold text-lg">${trainer.price}/hr</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleChat(trainer.name)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleVideoCall(trainer.name)}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video Call
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Trainers;
