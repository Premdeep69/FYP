import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("password123");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      // Get the updated user from localStorage after login
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        // Navigate based on user type
        if (userData.userType === 'trainer') {
          navigate("/trainer-dashboard");
        } else {
          navigate("/user-dashboard");
        }
      } else {
        // Fallback to user dashboard if user data not found
        navigate("/user-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-heading font-bold">Welcome Back</h2>
          <p className="text-muted-foreground">Login to continue your fitness journey</p>
        </div>

        {/* Test Credentials Info */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <strong>Test Credentials:</strong>
            <div className="mt-2 space-y-1">
              <div>User: <code className="bg-blue-100 px-1 rounded">user@example.com</code></div>
              <div>Trainer: <code className="bg-blue-100 px-1 rounded">trainer@example.com</code></div>
              <div>Password: <code className="bg-blue-100 px-1 rounded">password123</code></div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => handleQuickLogin("user@example.com")}
                className="text-xs"
              >
                Login as User
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => handleQuickLogin("trainer@example.com")}
                className="text-xs"
              >
                Login as Trainer
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
