/**
 * Billing & Subscription Management Page
 * Shows current plan, usage, subscription details, and management actions.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  ArrowUpRight,
  Check,
  Zap,
  Rocket,
  Users,
  Building2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Calendar,
  BarChart3,
  Shield,
  Database,
  FolderOpen,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap,
  pro: Rocket,
  team: Users,
  enterprise: Building2,
};

const PLAN_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  free: { text: "text-muted-foreground", bg: "bg-muted/30", border: "border-border" },
  pro: { text: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  team: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  enterprise: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
};

function UsageMeter() {
  const usageQuery = trpc.usage.get.useQuery(undefined, { staleTime: 30_000 });

  if (usageQuery.isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/30 p-6">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const usage = usageQuery.data;
  if (!usage) return null;

  const { totalRequests, limit, percentUsed, plan, remaining } = usage;
  const isUnlimited = limit === Infinity || limit === -1;
  const isNearLimit = percentUsed >= 80;
  const isOverLimit = percentUsed >= 100;

  const barColor = isOverLimit
    ? "bg-destructive"
    : isNearLimit
    ? "bg-amber-500"
    : "bg-primary";

  return (
    <div className="rounded-xl border border-border bg-card/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          API Usage This Month
        </h3>
        <span className="text-xs text-muted-foreground">
          Resets on the 1st of each month
        </span>
      </div>

      {isUnlimited ? (
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <div>
            <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">requests made · Unlimited plan</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-bold">
                {totalRequests.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}/{" "}{limit.toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {isOverLimit
                  ? "Limit reached — requests will be blocked"
                  : `${typeof remaining === 'number' ? remaining.toLocaleString() : remaining} requests remaining`}
              </p>
            </div>
            <span className={`text-sm font-semibold ${
              isOverLimit ? "text-destructive" : isNearLimit ? "text-amber-400" : "text-primary"
            }`}>
              {percentUsed}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, percentUsed)}%` }}
            />
          </div>

          {isNearLimit && !isOverLimit && (
            <p className="flex items-center gap-1.5 text-xs text-amber-400 mt-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              Approaching your monthly limit. Consider upgrading for more requests.
            </p>
          )}

          {isOverLimit && (
            <p className="flex items-center gap-1.5 text-xs text-destructive mt-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              Monthly limit reached. API requests are being blocked. Upgrade your plan to continue.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function Billing() {
  const [, navigate] = useLocation();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const planQuery = trpc.billing.getPlan.useQuery(undefined, {
    staleTime: 30_000,
  });

  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      toast.info("Opening billing portal...");
      window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to open billing portal");
    },
  });

  const cancelMutation = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription will be cancelled at the end of your billing period.");
      setCancelDialogOpen(false);
      planQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel subscription");
    },
  });

  if (planQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your subscription and billing</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const plan = planQuery.data;
  if (!plan) return null;

  const planKey = plan.plan || "free";
  const isFree = planKey === "free";
  const colors = PLAN_COLORS[planKey] || PLAN_COLORS.free;
  const PlanIcon = PLAN_ICONS[planKey] || Zap;
  const sub = plan.subscription;
  const isCancelling = sub?.cancelAtPeriodEnd;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatNumber = (n: number) => {
    if (n === -1) return "Unlimited";
    return n.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Current Plan Card */}
      <div className={`rounded-xl border ${colors.border} ${colors.bg} p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
              <PlanIcon className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{plan.planName} Plan</h2>
                {isCancelling && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" />
                    Cancelling
                  </span>
                )}
              </div>
              {!isFree && sub ? (
                <p className="text-sm text-muted-foreground mt-1">
                  {isCancelling
                    ? `Access until ${formatDate(sub.currentPeriodEnd)}`
                    : `Renews ${formatDate(sub.currentPeriodEnd)}`}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  No active subscription
                </p>
              )}
            </div>
          </div>

          {!isFree && (
            <div className="text-right">
              <p className="text-2xl font-bold">
                ${planKey === "pro" ? "39" : planKey === "team" ? "149" : "—"}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Plan Limits */}
      <div className="rounded-xl border border-border bg-card/30 p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Plan Limits
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Requests / month</span>
            </div>
            <p className="text-lg font-semibold">{formatNumber(plan.requestLimit)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="w-4 h-4" />
              <span className="text-xs">Data retention</span>
            </div>
            <p className="text-lg font-semibold">
              {plan.dataRetentionDays === -1 ? "Custom" : `${plan.dataRetentionDays} days`}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs">Projects</span>
            </div>
            <p className="text-lg font-semibold">{formatNumber(plan.maxProjects)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserPlus className="w-4 h-4" />
              <span className="text-xs">Team members</span>
            </div>
            <p className="text-lg font-semibold">{formatNumber(plan.maxTeamMembers)}</p>
          </div>
        </div>
      </div>

      {/* Usage Meter */}
      <UsageMeter />

      {/* Actions */}
      <div className="rounded-xl border border-border bg-card/30 p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Manage Subscription
        </h3>
        <div className="space-y-3">
          {isFree ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                You're on the Free plan. Upgrade to unlock more requests, longer data retention, and advanced security features.
              </p>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate("/pricing")}
              >
                <Zap className="w-4 h-4 mr-2" />
                Upgrade Plan
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              {/* Manage billing via Stripe Portal */}
              <Button
                variant="outline"
                className="border-border"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Manage Billing
                <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-60" />
              </Button>

              {/* Upgrade (if not on highest paid plan) */}
              {planKey === "pro" && (
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => navigate("/pricing")}
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Upgrade to Team
                </Button>
              )}

              {/* Cancel */}
              {!isCancelling && (
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel Subscription
                </Button>
              )}

              {isCancelling && (
                <p className="flex items-center gap-2 text-sm text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Your plan will revert to Free on {formatDate(sub?.currentPeriodEnd)}.
                  To reactivate, click "Manage Billing" above.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel your {plan.planName} subscription?</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                Your subscription will remain active until the end of your current billing period
                ({formatDate(sub?.currentPeriodEnd ?? null)}). After that, your account will revert to the Free plan.
              </p>
              <p>
                You'll lose access to:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>{formatNumber(plan.requestLimit)} requests/month (down to 5,000)</li>
                <li>{plan.dataRetentionDays}-day data retention (down to 7 days)</li>
                <li>Deep LLM security analysis</li>
                <li>Full explainability suite</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling...</>
              ) : (
                "Yes, Cancel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
