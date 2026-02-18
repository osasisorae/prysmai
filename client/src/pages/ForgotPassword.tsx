import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Link } from "wouter";

const LOGO_URL =
  "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-7_1771174049000_na1fn_cHJ5c20tbG9nby12Ny10cmFuc3BhcmVudA.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTdfMTc3MTE3NDA0OTAwMF9uYTFmbl9jSEo1YzIwdGJHOW5ieTEyTnkxMGNtRnVjM0JoY21WdWRBLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=MqBz0oXfOqKzCZQi3ynuCVp3WjXfcjNWJlvJnqHVP-kOhqkbQqLgZTJLaRBHnhPuA-~SxRFxJNlWWLTjfFdtXLnVZvJZCCcVQkG4Kd~3V0Nh-CxJCR9PqxIQxBWdYNJd5VJKxNWuMjZPaJqFJcLlhxNHdIIjLnVPMb2Zfv8Gy0Xr-Ot-nNFqxiLVBKjnLGqPqAqIJLz6Uu7e~Fj4aSIjQH6jYqDMKFcPqGdKXnJfMWqEpJXAqFqNqJqKqLqMqNqOqPqQqRqSqTqUqVqWqXqYqZq0q1q2q3q4q5q6q7q8q9qAqBqCqDqEqFqGqHqIqJqKqLqMqNqOqPqQqRqSqTqUqVqWqXqYqZq";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
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

          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground">
              If an account exists for <span className="text-foreground font-medium">{email}</span>,
              we've sent a password reset link. It expires in 1 hour.
            </p>
            <p className="text-sm text-muted-foreground">
              Didn't get it? Check your spam folder or{" "}
              <button
                onClick={() => setSubmitted(false)}
                className="text-primary hover:underline"
              >
                try again
              </button>
              .
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold tracking-tight mb-2">Reset your password</h1>
            <p className="text-muted-foreground text-sm">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-card border-border"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
