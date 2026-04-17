import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Mail, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithToken } = useAuth();

  const token = searchParams.get("token");
  const sent = searchParams.get("sent") === "true";
  const emailParam = searchParams.get("email") || "";

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token ? "verifying" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Auto-verify when token is in URL
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (t: string) => {
    setStatus("verifying");
    try {
      const data = await apiService.verifyEmail(t);
      if (data.token) {
        loginWithToken(data.token, data.user);
      }
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Verification failed");
    }
  };

  const handleResend = async () => {
    if (!resendEmail) {
      toast({ title: "Enter your email address", variant: "destructive" });
      return;
    }
    setResending(true);
    try {
      await apiService.resendVerificationEmail(resendEmail);
      setResendSent(true);
      toast({ title: "Verification email sent!", description: "Check your inbox." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleContinue = () => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      if (u.userType === "trainer") navigate("/pending-approval");
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

        <div className="bg-card rounded-2xl border border-border/60 shadow-md p-8 text-center">

          {/* Verifying state */}
          {status === "verifying" && (
            <>
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-heading font-bold mb-2">Verifying your email…</h1>
              <p className="text-muted-foreground text-sm">Please wait a moment.</p>
            </>
          )}

          {/* Success state */}
          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-xl font-heading font-bold mb-2">Email verified!</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Your account is now active. You can start using SmartGym.
              </p>
              <Button onClick={handleContinue} className="w-full h-11 font-semibold">
                Go to Dashboard
              </Button>
            </>
          )}

          {/* Error state */}
          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-xl font-heading font-bold mb-2">Verification failed</h1>
              <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
              <div className="space-y-3 text-left">
                <Label>Resend to your email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                />
                <Button onClick={handleResend} disabled={resending} className="w-full h-11 font-semibold">
                  {resending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                    : <><RefreshCw className="w-4 h-4 mr-2" />Resend Verification Email</>}
                </Button>
              </div>
            </>
          )}

          {/* Idle state — shown after registration (sent=true) */}
          {status === "idle" && (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-heading font-bold mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm mb-1">
                {sent
                  ? "We've sent a verification link to:"
                  : "Enter your email to receive a new verification link."}
              </p>
              {sent && emailParam && (
                <p className="font-semibold text-foreground mb-4">{emailParam}</p>
              )}
              <p className="text-muted-foreground text-xs mb-6">
                Click the link in the email to activate your account. The link expires in 24 hours.
              </p>

              {resendSent ? (
                <div className="flex items-center gap-2 justify-center text-success text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Verification email sent!
                </div>
              ) : (
                <div className="space-y-3 text-left">
                  <Label>Didn't receive it? Resend to:</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleResend}
                    disabled={resending}
                    variant="outline"
                    className="w-full h-11"
                  >
                    {resending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                      : <><RefreshCw className="w-4 h-4 mr-2" />Resend Verification Email</>}
                  </Button>
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already verified?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
