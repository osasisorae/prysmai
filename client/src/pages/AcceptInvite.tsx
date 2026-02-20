import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Users, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [accepted, setAccepted] = useState(false);

  // Validate the invite token
  const invite = trpc.team.validateInvite.useQuery(
    { token },
    { enabled: !!token }
  );

  const acceptMutation = trpc.team.acceptInvite.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setAccepted(true);
        toast.success("Invitation accepted! Welcome to the team.");
        setTimeout(() => setLocation("/dashboard"), 2000);
      } else {
        toast.error(data.error || "Failed to accept invitation.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAccept = () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      setLocation(`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
      return;
    }
    acceptMutation.mutate({ token });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-semibold mb-2">Invalid Invitation</h1>
            <p className="text-sm text-muted-foreground mb-6">
              No invite token was provided. Please check your invitation link.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite.data?.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-semibold mb-2">Invitation Expired</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This invitation is no longer valid. It may have already been accepted or revoked.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <h1 className="text-xl font-semibold mb-2">Welcome to the Team!</h1>
            <p className="text-sm text-muted-foreground mb-2">
              You've joined <strong>{invite.data.invite?.orgName}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inviteData = invite.data.invite;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Team Invitation</h1>
            <p className="text-sm text-muted-foreground">
              You've been invited to join
            </p>
            <p className="text-lg font-semibold text-primary mt-1">
              {inviteData?.orgName || "an organization"}
            </p>
          </div>

          <div className="bg-background rounded-lg border border-border p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{inviteData?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{inviteData?.role}</span>
            </div>
          </div>

          {isAuthenticated ? (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Accept Invitation
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Please log in or create an account to accept this invitation.
              </p>
              <Button className="w-full" onClick={handleAccept}>
                <Shield className="w-4 h-4 mr-2" />
                Log In to Accept
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
