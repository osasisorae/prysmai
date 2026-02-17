/**
 * EarlyAccessModal — Global modal for waitlist signup
 * Triggers from any "Get Early Access" CTA across the site
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface EarlyAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EarlyAccessModal({ open, onOpenChange }: EarlyAccessModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.success("You're already on the list. We'll be in touch.");
      }
      setSubmitted(true);
      setIsSubmitting(false);
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    joinWaitlist.mutate({ email, source: "modal" });
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    // Reset state after close animation
    if (!open) {
      setTimeout(() => {
        setEmail("");
        setSubmitted(false);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        {!submitted ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Get Early Access
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                Join the builders who go deeper. Be the first to see inside your
                AI with full observability — latency, tokens, cost, and complete
                request/response capture.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-secondary/30 border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                {isSubmitting ? (
                  "Joining..."
                ) : (
                  <>
                    Request Early Access
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-3 space-y-2">
              {[
                "One-line SDK integration",
                "Full request/response capture",
                "No credit card required",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2">
              You're on the list
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto mb-6">
              We'll review your request and send you an invite when your spot is
              ready. Keep an eye on your inbox.
            </p>
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-border hover:border-primary/50"
            >
              Got it
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
