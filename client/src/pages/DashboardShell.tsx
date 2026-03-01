import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
// Custom auth: using /login route
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Search,
  Key,
  Settings as SettingsIcon,
  Shield,
  Brain,
  BookOpen,
  LogOut,
  ChevronDown,
  Loader2,
  Sparkles,
  ArrowUpRight,
  CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardOverview from "./Dashboard";
import RequestExplorer from "./RequestExplorer";
import ApiKeys from "./ApiKeys";
import SettingsPage from "./Settings";
import SecurityDashboard from "./SecurityDashboard";
import ExplainabilityPage from "./Explainability";
import Playbooks from "./Playbooks";
import Billing from "./Billing";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { id: "explorer", label: "Requests", icon: Search, path: "/dashboard/requests" },
  { id: "keys", label: "API Keys", icon: Key, path: "/dashboard/keys" },
  { id: "security", label: "Security", icon: Shield, path: "/dashboard/security" },
  { id: "explainability", label: "Explainability", icon: Brain, path: "/dashboard/explainability" },
  { id: "playbooks", label: "Playbooks", icon: BookOpen, path: "/dashboard/playbooks" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "/dashboard/billing" },
  { id: "settings", label: "Settings", icon: SettingsIcon, path: "/dashboard/settings" },
];

const PLAN_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: "Free", color: "text-muted-foreground", bg: "bg-muted/50" },
  pro: { label: "Pro", color: "text-primary", bg: "bg-primary/10" },
  team: { label: "Team", color: "text-violet-400", bg: "bg-violet-500/10" },
  enterprise: { label: "Enterprise", color: "text-amber-400", bg: "bg-amber-500/10" },
};

function PlanIndicator() {
  const plan = trpc.billing.getPlan.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });
  const [, setLocation] = useLocation();

  if (plan.isLoading) {
    return (
      <div className="px-3 py-2 border-b border-border">
        <Skeleton className="h-7 w-full rounded-md" />
      </div>
    );
  }

  const currentPlan = plan.data?.plan || "free";
  const badge = PLAN_BADGES[currentPlan] || PLAN_BADGES.free;
  const isFree = currentPlan === "free";

  return (
    <div className="px-3 py-2 border-b border-border">
      {isFree ? (
        <button
          onClick={() => setLocation("/pricing")}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Upgrade Plan</span>
          </div>
          <ArrowUpRight className="w-3 h-3 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      ) : (
        <button
          onClick={() => setLocation("/dashboard/billing")}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md ${badge.bg} hover:opacity-80 transition-opacity cursor-pointer`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={`w-3.5 h-3.5 ${badge.color}`} />
            <span className={`text-xs font-medium ${badge.color}`}>{badge.label} Plan</span>
          </div>
          {plan.data?.subscription?.cancelAtPeriodEnd && (
            <span className="text-[10px] text-muted-foreground">Cancelling</span>
          )}
        </button>
      )}
    </div>
  );
}

export default function DashboardShell() {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const org = trpc.org.get.useQuery(undefined, { enabled: !!user });
  const projects = trpc.project.list.useQuery(undefined, { enabled: !!user && !!org.data });

  // ─── Checkout verification fallback ───
  // When user returns from Stripe checkout, the webhook may not have fired yet.
  // Detect ?checkout=success&plan=X and call verifyCheckout to update the plan immediately.
  const verifyCheckout = trpc.billing.verifyCheckout.useMutation();
  const trpcUtils = trpc.useUtils();
  const checkoutVerified = useRef(false);

  useEffect(() => {
    if (checkoutVerified.current) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const checkoutPlan = params.get("plan") as "pro" | "team" | null;

    if (checkoutStatus === "success" && checkoutPlan) {
      checkoutVerified.current = true;
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.pathname);

      // Show immediate success toast
      toast.success(`Welcome to ${checkoutPlan === "pro" ? "Pro" : "Team"}! Activating your plan...`);

      // Poll verify endpoint with retry
      const verify = async (attempt = 0) => {
        try {
          const result = await verifyCheckout.mutateAsync({ plan: checkoutPlan });
          if (result.success) {
            toast.success(`${checkoutPlan === "pro" ? "Pro" : "Team"} plan is now active!`);
            // Invalidate plan query to refresh the sidebar badge
            trpcUtils.billing.getPlan.invalidate();
          } else if (attempt < 3) {
            // Webhook may still be processing, retry after delay
            setTimeout(() => verify(attempt + 1), 2000 * (attempt + 1));
          }
        } catch {
          if (attempt < 3) {
            setTimeout(() => verify(attempt + 1), 2000 * (attempt + 1));
          }
        }
      };
      verify();
    }
  }, []);

  // Determine if we need to redirect to onboarding
  const needsOnboarding = org.isSuccess && !org.data;
  const noProjects = !needsOnboarding && !org.isLoading && !projects.isLoading && projects.isSuccess && (!projects.data || projects.data.length === 0);

  // Bug fix: wrap redirects in useEffect to avoid setState-during-render
  useEffect(() => {
    if (needsOnboarding || noProjects) {
      setLocation("/onboarding");
    }
  }, [needsOnboarding, noProjects, setLocation]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png" alt="Prysm AI" className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-semibold">Sign in to access your dashboard</h1>
          <Button onClick={() => (window.location.href = "/login")}>Sign In</Button>
        </div>
      </div>
    );
  }

  // Waiting for redirect to onboarding (render loading spinner while useEffect fires)
  if (needsOnboarding || noProjects) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Loading org/projects
  if (org.isLoading || projects.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const activeProject = projects.data?.[0];
  if (!activeProject) {
    // Fallback — shouldn't reach here due to noProjects check above
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Determine active page
  const activePath = location;
  const activeNav = NAV_ITEMS.find((item) => activePath === item.path) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card/50 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png" alt="Prysm AI" className="w-7 h-7" />
            <span className="text-sm font-semibold tracking-tight">
              Prysm<span className="text-primary">AI</span>
            </span>
          </div>
        </div>

        {/* Project selector */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/50 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="truncate text-xs font-medium">{activeProject.name}</span>
          </div>
        </div>

        {/* Plan indicator */}
        <PlanIndicator />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.path;
            return (
              <button
                key={item.id}
                onClick={() => setLocation(item.path)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors text-left">
                <Avatar className="h-7 w-7 border shrink-0">
                  <AvatarFallback className="text-xs">{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user.name}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {activeNav.id === "overview" && <DashboardOverview projectId={activeProject.id} />}
          {activeNav.id === "explorer" && <RequestExplorer projectId={activeProject.id} />}
          {activeNav.id === "keys" && <ApiKeys projectId={activeProject.id} />}
          {activeNav.id === "security" && <SecurityDashboard projectId={activeProject.id} />}
          {activeNav.id === "explainability" && <ExplainabilityPage projectId={activeProject.id} />}
          {activeNav.id === "playbooks" && <Playbooks projectId={activeProject.id} />}
          {activeNav.id === "billing" && <Billing />}
          {activeNav.id === "settings" && <SettingsPage projectId={activeProject.id} />}
        </div>
      </main>
    </div>
  );
}
