import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Trainer {
  _id: string;
  name: string;
  email: string;
  trainerProfile: {
    specializations: string[];
    certifications: string[];
    experience: number;
    hourlyRate: number;
    rating: {
      average: number;
      count: number;
    };
  };
  stats?: {
    totalWorkouts: number;
  };
}

const Trainers = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/trainers');
      if (!response.ok) {
        throw new Error('Failed to fetch trainers');
      }
      const data = await response.json();
      setTrainers(data);
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
      toast({
        title: "Error",
        description: "Failed to load trainers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChat = (trainerId: string, trainerName: string) => {
    // Only users can chat with trainers
    if (user?.userType !== 'user') {
      toast({
        title: "Access Restricted",
        description: "Only users can chat with trainers.",
        variant: "destructive",
      });
      return;
    }
    navigate('/chat', { state: { trainerId, trainerName } });
  };

  const handleVideoCall = (trainerId: string, trainerName: string) => {
    // Only users can video call trainers
    if (user?.userType !== 'user') {
      toast({
        title: "Access Restricted",
        description: "Only users can video call trainers.",
        variant: "destructive",
      });
      return;
    }
    navigate('/video-call', { state: { trainerId, trainerName } });
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading trainers...</div>
          </div>
        </div>
      </div>
    );
  }

  if (trainers.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Expert Trainers</h1>
            <p className="text-lg text-muted-foreground">
              Connect with certified trainers who can help you achieve your goals
            </p>
          </div>
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No trainers available at the moment.</p>
          </Card>
        </div>
      </div>
    );
  }

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
            <Card key={trainer._id} className="p-6 card-hover">
              <div className="mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-4 flex items-center justify-center text-2xl font-bold text-white">
                  {trainer.name.charAt(0)}
                </div>
                <h3 className="text-xl font-heading font-bold mb-1">{trainer.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-medium">
                      {trainer.trainerProfile?.rating?.average?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {trainer.trainerProfile?.rating?.count || 0} reviews
                  </span>
                </div>
              </div>

              {trainer.trainerProfile?.certifications && trainer.trainerProfile.certifications.length > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  {trainer.trainerProfile.certifications.join(', ')}
                </p>
              )}

              {trainer.trainerProfile?.specializations && trainer.trainerProfile.specializations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {trainer.trainerProfile.specializations.map((spec, index) => (
                    <Badge key={index} variant="outline">
                      {spec}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <div className="text-sm text-muted-foreground">Experience</div>
                  <div className="font-medium">
                    {trainer.trainerProfile?.experience || 0} years
                  </div>
                </div>
                {trainer.trainerProfile?.hourlyRate && (
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Price</div>
                    <div className="font-bold text-lg">
                      ${trainer.trainerProfile.hourlyRate}/hr
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {user?.userType === 'user' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleChat(trainer._id, trainer.name)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleVideoCall(trainer._id, trainer.name)}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video Call
                    </Button>
                  </>
                ) : (
                  <div className="text-center w-full py-2 text-sm text-muted-foreground">
                    Only users can chat with trainers
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Trainers;
