import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

type InviteStatus = "loading" | "valid" | "invalid" | "already_exists";

export default function SetupAccount() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";

  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate the invite token on mount
  useEffect(() => {
    if (!token) {
      setInviteStatus("invalid");
      return;
    }

    fetch(`/api/auth/validate-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInviteStatus("valid");
          setInviteEmail(data.email);
        } else if (data.alreadyExists) {
          setInviteStatus("already_exists");
        } else {
          setInviteStatus("invalid");
        }
      })
      .catch(() => {
        setInviteStatus("invalid");
      });
  }, [token]);

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 8) return { label: "Too short", color: "text-red-400", width: "w-1/4" };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 1) return { label: "Weak", color: "text-red-400", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "text-yellow-400", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "text-primary", width: "w-3/4" };
    return { label: "Strong", color: "text-green-400", width: "w-full" };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, name: name.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create account.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Account created! Welcome to Prysm AI.");
      // Navigate to onboarding
      navigate("/onboarding");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (inviteStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating your invite...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (inviteStatus === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Invalid Invite Link
          </h1>
          <p className="text-muted-foreground mb-6">
            This invite link is invalid or has expired. If you believe this is an error, please contact us.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Already exists
  if (inviteStatus === "already_exists") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Account Already Exists
          </h1>
          <p className="text-muted-foreground mb-6">
            An account with this email already exists. Please log in instead.
          </p>
          <Button onClick={() => navigate("/login")} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Valid invite — show the setup form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Set Up Your Account
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome! Create your password to get started.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>
              Email
            </label>
            <Input
              type="email"
              value={inviteEmail}
              disabled
              className="bg-card/50 border-border text-foreground opacity-70"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>
              Full Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-card/50 border-border text-foreground"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="bg-card/50 border-border text-foreground pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordStrength && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-border overflow-hidden">
                  <div className={`h-full rounded-full bg-current ${passwordStrength.color} ${passwordStrength.width} transition-all duration-300`} />
                </div>
                <p className={`text-xs mt-1 ${passwordStrength.color}`}>{passwordStrength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5" style={{ fontFamily: "var(--font-mono)" }}>
              Confirm Password
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="bg-card/50 border-border text-foreground"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            disabled={isSubmitting || password.length < 8 || password !== confirmPassword || !name.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}
