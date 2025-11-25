import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users } from "lucide-react";

const VideoCall = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);

  const handleEndCall = () => {
    setIsInCall(false);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Video Call</h1>
        </div>

        <div className="max-w-5xl mx-auto">
          <Card className="overflow-hidden">
            {/* Main Video Area */}
            <div className="relative bg-gradient-to-br from-primary/20 to-secondary/20 aspect-video flex items-center justify-center">
              {!isInCall ? (
                <div className="text-center">
                  <Users className="w-24 h-24 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-2xl font-heading font-bold mb-2">Ready to start?</h3>
                  <p className="text-muted-foreground mb-6">
                    Click the button below to join the video call
                  </p>
                  <Button size="lg" onClick={() => setIsInCall(true)}>
                    Join Call
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary mb-4 mx-auto" />
                    <h3 className="text-xl font-heading font-bold">Sarah Johnson</h3>
                    <p className="text-muted-foreground">Personal Trainer</p>
                  </div>

                  {/* Self View */}
                  <div className="absolute bottom-4 right-4 w-48 aspect-video bg-card border-2 border-border rounded-lg overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">You</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            {isInCall && (
              <div className="p-6 bg-card border-t border-border">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="lg"
                    className="rounded-full w-14 h-14"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </Button>

                  <Button
                    variant={!isVideoOn ? "destructive" : "outline"}
                    size="lg"
                    className="rounded-full w-14 h-14"
                    onClick={() => setIsVideoOn(!isVideoOn)}
                  >
                    {isVideoOn ? (
                      <VideoIcon className="w-5 h-5" />
                    ) : (
                      <VideoOff className="w-5 h-5" />
                    )}
                  </Button>

                  <Button
                    variant="destructive"
                    size="lg"
                    className="rounded-full w-14 h-14"
                    onClick={handleEndCall}
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <p>Call duration: 00:00</p>
                </div>
              </div>
            )}
          </Card>

          {!isInCall && (
            <Card className="mt-6 p-6">
              <h3 className="font-heading font-bold mb-4">Before you join</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Make sure you have a stable internet connection</li>
                <li>• Check that your camera and microphone are working</li>
                <li>• Find a quiet space with good lighting</li>
                <li>• Have your workout questions ready</li>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
