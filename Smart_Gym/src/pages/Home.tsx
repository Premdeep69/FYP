import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, Target, Users, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-fitness.jpg";

const Home = () => {
  const features = [
    {
      icon: Activity,
      title: "Exercise Library",
      description: "Access hundreds of exercises with detailed instructions and video guides",
    },
    {
      icon: Target,
      title: "Custom Workout Plans",
      description: "Get personalized plans based on your fitness goals and experience level",
    },
    {
      icon: Users,
      title: "Expert Trainers",
      description: "Connect with certified trainers for one-on-one guidance and support",
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      description: "Monitor your fitness journey with comprehensive analytics and insights",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 leading-tight">
              Transform Your
              <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Fitness Journey
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Get personalized workout plans, expert guidance, and track your progress
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/workout-plans">
                <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8">
                  Start Workout
                </Button>
              </Link>
              <Link to="/trainers">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-12 px-8">
                  Join as Trainer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Your Complete Fitness Platform
            </h2>
            <p className="text-lg text-muted-foreground">
              Our platform combines cutting-edge technology with expert knowledge to help you achieve your fitness goals faster and smarter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 card-hover border-border bg-card">
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-heading font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="p-12 text-center hero-gradient border-0">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-foreground mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join thousands of members who are already transforming their lives
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg h-12 px-8">
                  Create Free Account
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-12 px-8 bg-white/10 text-white border-white/20 hover:bg-white/20">
                  Login
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
