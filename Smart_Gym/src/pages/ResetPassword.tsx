import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Lock, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithToken } = useAuth();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(!token);

  const strength = (() => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: "Too short", color: "bg-destructive", width: "w-1/4" };
    if (password.length < 8) return { label: "Weak", color: "bg-warning", width: "w-2/4" };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: "Strong", color: "bg-success", width: "w-full" };
    return { label: "Fair", color: "bg-info", width: "w-3/4" };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters required.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data = await apiService.resetPassword(token, password);
      if (data.token) {
        loginWithToken(data.token, data.user);
      }
      setDone(true);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("expired") || err.message?.toLowerCase().includes("invalid")) {
        setTokenInvalid(true);
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      if (u.userType === "trainer") navigate("/trainer-dashboard");
      else if (u.userType === "admin") navigate("/admin");
      else navigate("/user-dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl">Smart<span className="text-primary">Gym</span></span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 shadow-md p-8">

          {/* Invalid / expired token */}
          {tokenInvalid && (
            <div className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-xl font-heading font-bold mb-2">Link expired or invalid</h1>
              <p className="text-muted-foreground text-sm mb-6">
                This password reset link has expired or already been used. Please request a new one.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full h-11 font-semibold">Request New Reset Link</Button>
              </Link>
            </div>
          )}

          {/* Success */}
          {done && !tokenInvalid && (
            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-xl font-heading font-bold mb-2">Password reset!</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Your password has been updated. You are now logged in.
              </p>
              <Button onClick={handleContinue} className="w-full h-11 font-semibold">
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Form */}
          {!done && !tokenInvalid && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-heading font-bold tracking-tight mb-1.5">Create new password</h1>
                <p className="text-muted-foreground text-sm">
                  Choose a strong password for your SmartGym account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-9 pr-10 h-11"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {strength && (
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{strength.label}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      className="pl-9 pr-10 h-11"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-xs text-destructive mt-1">Passwords don't match</p>
                  )}
                  {confirm && password === confirm && confirm.length >= 6 && (
                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading || password !== confirm || password.length < 6}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting…</>
                    : "Reset Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
