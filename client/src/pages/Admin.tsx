import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Shield, Users, Mail, Calendar, ArrowLeft, Download, LogOut } from "lucide-react";
import type { WaitlistSignup } from "../../../drizzle/schema";
import { Link } from "wouter";

export default function Admin() {
  const { user, loading, isAuthenticated, logout } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const { data: signups, isLoading: signupsLoading } = trpc.waitlist.list.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: countData } = trpc.waitlist.count.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin access to view this page.</p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!signups || signups.length === 0) return;
    const headers = ["Email", "Source", "Signed Up"];
    const rows = signups.map((s: WaitlistSignup) => [
      s.email,
      s.source ?? "landing_page",
      new Date(s.createdAt).toLocaleString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prysm-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Admin Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Prysm<span className="text-primary">AI</span>
                </span>
              </div>
            </Link>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium border border-primary/30 text-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="border-border hover:border-primary/50"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link href="/">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-3">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to site
                </span>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Waitlist Dashboard
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!signups || signups.length === 0}
              className="border-border hover:border-primary/50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  Total Signups
                </span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {countData?.count ?? 0}
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  Goal Progress
                </span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {countData?.count ?? 0}
                <span className="text-lg text-muted-foreground font-normal"> / 100</span>
              </p>
              <div className="mt-2 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(((countData?.count ?? 0) / 100) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  Latest Signup
                </span>
              </div>
              <p className="text-lg font-medium" style={{ fontFamily: "var(--font-display)" }}>
                {signups && signups.length > 0
                  ? new Date(signups[0].createdAt).toLocaleDateString()
                  : "No signups yet"}
              </p>
            </div>
          </div>

          {/* Signups Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-card/50 px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                All Signups
              </h2>
            </div>
            {signupsLoading ? (
              <div className="p-12 text-center text-muted-foreground animate-pulse">
                Loading signups...
              </div>
            ) : !signups || signups.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No signups yet. Share your landing page to start collecting emails.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground border-b border-border" style={{ fontFamily: "var(--font-mono)" }}>
                      #
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground border-b border-border" style={{ fontFamily: "var(--font-mono)" }}>
                      Email
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground border-b border-border" style={{ fontFamily: "var(--font-mono)" }}>
                      Source
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground border-b border-border" style={{ fontFamily: "var(--font-mono)" }}>
                      Signed Up
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((signup: WaitlistSignup, i: number) => (
                    <tr key={signup.id} className="border-b border-border/50 last:border-0 hover:bg-card/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-6 py-3 text-foreground font-medium">{signup.email}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded text-xs border border-border text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                          {signup.source ?? "landing_page"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {new Date(signup.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
