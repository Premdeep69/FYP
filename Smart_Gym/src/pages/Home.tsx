import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Target, Users, TrendingUp, ArrowRight,
  Dumbbell, Shield, Zap, CheckCircle, Play,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-fitness.jpg";

const features = [
  {
    icon: Activity,
    title: "Exercise Library",
    description: "Hundreds of exercises with step-by-step instructions and video demonstrations.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    href: "/exercises",
  },
  {
    icon: Target,
    title: "Custom Workout Plans",
    description: "Personalized plans built around your goals, schedule, and fitness level.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    href: "/workout-plans",
  },
  {
    icon: Users,
    title: "Expert Trainers",
    description: "Connect with certified trainers for one-on-one coaching and accountability.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    href: "/trainers",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Comprehensive analytics and insights to keep you motivated and on track.",
    color: "text-orange-600",
    bg: "bg-orange-50",
    href: "/user-dashboard",
  },
];

const benefits = [
  "Verified & certified trainers",
  "Real-time session booking",
  "Progress analytics & insights",
  "Online & in-person sessions",
  "Flexible scheduling",
  "Secure payments",
];

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="Fitness" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/70 to-gray-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-20">
          <div className="max-w-2xl">
            <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors">
              <Zap className="w-3 h-3 mr-1.5 text-yellow-400" />
              Your complete fitness platform
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-white mb-6 leading-[1.05] tracking-tight">
              Train Smarter,
              <span className="block mt-1 bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Achieve More
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 mb-10 leading-relaxed max-w-xl">
              Personalized workout plans, expert trainers, and real-time progress tracking — everything you need to reach your fitness goals.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              {user ? (
                <Link to={user.userType === 'trainer' ? '/trainer-dashboard' : '/user-dashboard'}>
                  <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-brand">
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-brand">
                      Start for Free <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/workout-plans">
                    <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold bg-white/10 text-white border-white/25 hover:bg-white/20 backdrop-blur-sm">
                      <Play className="w-4 h-4 mr-2" /> Browse Plans
                    </Button>
                  </Link>
                </>
              )}
            </div>


          </div>
        </div>


      </section>

      {/* ── Features ── */}
      <section className="section bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-accent">Platform Features</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-muted-foreground text-lg">
              A complete ecosystem built to support every step of your fitness journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <Link key={i} to={f.href}>
                <Card className="p-6 border-border/60 hover-lift group cursor-pointer h-full">
                  <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-heading font-bold text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why SmartGym ── */}
      <section className="section bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-accent">Why SmartGym</Badge>
              <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-5">
                Built for real results, not just workouts
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                We combine expert knowledge with smart technology to give you a fitness experience that actually works — whether you're a beginner or a seasoned athlete.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {benefits.map(b => (
                  <div key={b} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{b}</span>
                  </div>
                ))}
              </div>
              {!user && (
                <div className="flex gap-3 mt-8">
                  <Link to="/register">
                    <Button className="font-semibold">Get Started Free</Button>
                  </Link>
                  <Link to="/trainers">
                    <Button variant="outline" className="font-semibold">Meet Our Trainers</Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, title: "Verified Trainers", desc: "Every trainer is background-checked and certified", color: "text-blue-600", bg: "bg-blue-50", href: "/trainers" },
                { icon: Zap, title: "Instant Booking", desc: "Book sessions in seconds, no back-and-forth", color: "text-violet-600", bg: "bg-violet-50", href: "/browse-slots" },
                { icon: TrendingUp, title: "Track Progress", desc: "Visual dashboards to see how far you've come", color: "text-emerald-600", bg: "bg-emerald-50", href: "/user-dashboard" },
                { icon: Dumbbell, title: "500+ Exercises", desc: "Comprehensive library with video guides", color: "text-orange-600", bg: "bg-orange-50", href: "/exercises" },
              ].map(({ icon: Icon, title, desc, color, bg, href }) => (
                <Link key={title} to={href}>
                  <Card className="p-5 border-border/60 hover-lift group cursor-pointer h-full">
                    <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <h4 className="font-heading font-bold text-sm mb-1">{title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      {!user && (
        <section className="section">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-2xl hero-gradient p-10 md:p-16 text-center">
              {/* Decorative circles */}
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
              <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <Badge className="mb-5 bg-white/15 text-white border-white/20">
                  <Zap className="w-3 h-3 mr-1.5 text-yellow-300" /> Free to get started
                </Badge>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 tracking-tight">
                  Ready to transform your fitness?
                </h2>
                <p className="text-white/70 text-lg mb-8">
                  Join thousands of members already achieving their goals with SmartGym.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/register">
                    <Button size="lg" className="h-12 px-8 bg-white text-primary hover:bg-white/90 font-semibold shadow-xl">
                      Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="h-12 px-8 bg-white/10 text-white border-white/25 hover:bg-white/20 font-semibold">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/30 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg hero-gradient flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-heading font-bold text-foreground">Smart<span className="text-primary">Gym</span></span>
            </div>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} SmartGym. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/exercises" className="hover:text-foreground transition-colors">Exercises</Link>
              <Link to="/trainers" className="hover:text-foreground transition-colors">Trainers</Link>
              <Link to="/workout-plans" className="hover:text-foreground transition-colors">Plans</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
