import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, CheckCircle, XCircle, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Link, useSearch } from "wouter";

const LOGO_URL =
  "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-7_1771174049000_na1fn_cHJ5c20tbG9nby12Ny10cmFuc3BhcmVudA.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTdfMTc3MTE3NDA0OTAwMF9uYTFmbl9jSEo1YzIwdGJHOW5ieTEyTnkxMGNtRnVjM0JoY21WdWRBLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=MqBz0oXfOqKzCZQi3ynuCVp3WjXfcjNWJlvJnqHVP-kOhqkbQqLgZTJLaRBHnhPuA-~SxRFxJNlWWLTjfFdtXLnVZvJZCCcVQkG4Kd~3V0Nh-CxJCR9PqxIQxBWdYNJd5VJKxNWuMjZPaJqFJcLlhxNHdIIjLnVPMb2Zfv8Gy0Xr-Ot-nNFqxiLVBKjnLGqPqAqIJLz6Uu7e~Fj4aSIjQH6jYqDMKFcPqGdKXnJfMWqEpJXAqFqNqJqKqLqMqNqOqPqQqRqSqTqUqVqWqXqYqZq0q1q2q3q4q5q6q7q8q9qAqBqCqDqEqFqGqHqIqJqKqLqMqNqOqPqQqRqSqTqUqVqWqXqYqZq";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

export default function ResetPassword() {
  const searchString = useSearch();
  const token = useMemo(() => new URLSearchParams(searchString).get("token") || "", [searchString]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Token validation
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }

    fetch(`/api/auth/validate-reset?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setTokenValid(data.valid);
        if (data.email) setTokenEmail(data.email);
      })
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // No token or invalid token
  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-full max-w-md px-6 text-center space-y-4">
          <div className="text-center mb-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src={LOGO_URL} alt="Prysm AI" className="w-8 h-8" />
              <span className="text-lg font-semibold tracking-tight">
                Prysm<span className="text-primary">AI</span>
              </span>
            </Link>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Invalid or expired link</h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/forgot-password">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Request new link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Back to login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-full max-w-md px-6 text-center space-y-4">
          <div className="text-center mb-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src={LOGO_URL} alt="Prysm AI" className="w-8 h-8" />
              <span className="text-lg font-semibold tracking-tight">
                Prysm<span className="text-primary">AI</span>
              </span>
            </Link>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Password reset!</h1>
          <p className="text-muted-foreground">
            Your password has been updated. You can now log in with your new password.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                Go to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <img src={LOGO_URL} alt="Prysm AI" className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-tight">
              Prysm<span className="text-primary">AI</span>
            </span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Set a new password</h1>
            {tokenEmail && (
              <p className="text-muted-foreground text-sm">
                For <span className="text-foreground font-medium">{tokenEmail}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-card border-border"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{strength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-11 bg-card border-border"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400">Passwords don't match</p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              disabled={isSubmitting || password.length < 8 || password !== confirmPassword}
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
