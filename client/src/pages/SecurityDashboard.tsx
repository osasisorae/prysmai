/**
 * Security Dashboard — Layer 2
 * 
 * Tabs:
 *   1. Overview — threat stats, timeline chart, top patterns
 *   2. Threat Log — paginated security events table
 *   3. Configuration — toggle detection modules, set blocking, custom keywords
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Eye,
  EyeOff,
  Ban,
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────

interface SecurityDashboardProps {
  projectId: number;
}

// ─── Threat Level Badge ─────────────────────────────────────────────

function ThreatBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; bg: string; icon: any }> = {
    clean: { color: "text-green-400", bg: "bg-green-400/10", icon: ShieldCheck },
    low: { color: "text-yellow-400", bg: "bg-yellow-400/10", icon: Shield },
    medium: { color: "text-orange-400", bg: "bg-orange-400/10", icon: ShieldAlert },
    high: { color: "text-red-400", bg: "bg-red-400/10", icon: ShieldX },
  };
  const c = config[level] ?? config.low;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
      <Icon className="w-3 h-3" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    pass: { color: "text-green-400", bg: "bg-green-400/10" },
    log: { color: "text-blue-400", bg: "bg-blue-400/10" },
    warn: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
    block: { color: "text-red-400", bg: "bg-red-400/10" },
  };
  const c = config[action] ?? config.log;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
      {action === "block" && <Ban className="w-3 h-3" />}
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </span>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────

function OverviewTab({ projectId }: { projectId: number }) {
  const stats = trpc.security.getStats.useQuery({ projectId });
  const timeline = trpc.security.getTimeline.useQuery({ projectId, days: 14 });
  const topPatterns = trpc.security.getTopPatterns.useQuery({ projectId, limit: 8 });
  const recentEvents = trpc.security.getEvents.useQuery({ projectId, limit: 10 });

  // Transform timeline data for Recharts stacked bar chart
  const chartData = useMemo(() => {
    if (!timeline.data?.length) return [];
    const dateMap = new Map<string, { date: string; low: number; medium: number; high: number }>();
    for (const row of timeline.data) {
      const d = row.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, low: 0, medium: 0, high: 0 });
      }
      const entry = dateMap.get(d)!;
      const count = Number(row.count);
      if (row.threatLevel === "low") entry.low += count;
      else if (row.threatLevel === "medium") entry.medium += count;
      else if (row.threatLevel === "high") entry.high += count;
    }
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [timeline.data]);

  if (stats.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const s = stats.data ?? { total: 0, clean: 0, low: 0, medium: 0, high: 0, blocked: 0 };

  const statCards = [
    { label: "Total Threats", value: s.total, icon: Activity, color: "text-primary" },
    { label: "Low", value: s.low, icon: Shield, color: "text-yellow-400" },
    { label: "Medium", value: s.medium, icon: ShieldAlert, color: "text-orange-400" },
    { label: "High", value: s.high, icon: ShieldX, color: "text-red-400" },
    { label: "Blocked", value: s.blocked, icon: Ban, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="p-4 rounded-lg border border-border bg-card/50">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Threat Timeline Chart */}
      <div className="rounded-lg border border-border bg-card/50 p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Threat Timeline (14 days)
        </h3>
        {timeline.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !chartData.length ? (
          <div className="text-center py-12">
            <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No threat data in the last 14 days</p>
          </div>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                  }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                  labelFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
                />
                <Bar dataKey="low" stackId="threats" fill="#facc15" name="Low" radius={[0, 0, 0, 0]} />
                <Bar dataKey="medium" stackId="threats" fill="#fb923c" name="Medium" radius={[0, 0, 0, 0]} />
                <Bar dataKey="high" stackId="threats" fill="#ef4444" name="High" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two columns: Top Patterns + Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Injection Patterns */}
        <div className="rounded-lg border border-border bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Top Detected Patterns
          </h3>
          {topPatterns.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !topPatterns.data?.length ? (
            <div className="text-center py-8">
              <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No threats detected yet</p>
              <p className="text-xs text-muted-foreground mt-1">Patterns will appear here as requests are scanned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topPatterns.data.map((p, i) => {
                const maxCount = topPatterns.data![0].count;
                const pct = maxCount > 0 ? (p.count / maxCount) * 100 : 0;
                return (
                  <div key={i} className="relative">
                    <div
                      className="absolute inset-0 rounded bg-red-400/10"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums ml-2">{p.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Threats */}
        <div className="rounded-lg border border-border bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Recent Threats
          </h3>
          {recentEvents.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !recentEvents.data?.length ? (
            <div className="text-center py-8">
              <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All clear — no threats detected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents.data.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-3 py-2 rounded border border-border/50 bg-background/50"
                >
                  <ThreatBadge level={event.threatLevel} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {event.summary ?? "No details"}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    Score: {event.threatScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Threat Log Tab ─────────────────────────────────────────────────

function ThreatLogTab({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(0);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const limit = 20;

  const events = trpc.security.getEvents.useQuery({
    projectId,
    limit,
    offset: page * limit,
    threatLevel: levelFilter !== "all" ? (levelFilter as any) : undefined,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => events.refetch()}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Events Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Time</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Threat</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Score</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Model</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Scan</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                </td>
              </tr>
            ) : !events.data?.length ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No security events found</p>
                </td>
              </tr>
            ) : (
              events.data.map((event) => (
                <React.Fragment key={event.id}>
                <tr className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <ThreatBadge level={event.threatLevel} />
                  </td>
                  <td className="px-4 py-2.5 text-xs tabular-nums font-medium">
                    {event.threatScore}
                  </td>
                  <td className="px-4 py-2.5">
                    <ActionBadge action={event.action} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {event.model ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {(event as any).llmScanned ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                        <Eye className="w-2.5 h-2.5" />
                        Deep
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/50 text-muted-foreground">
                        Rules
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                    {(event as any).llmScanned && (event as any).llmExplanation
                      ? (event as any).llmExplanation
                      : (event.summary ?? "—")}
                  </td>
                </tr>
                {/* LLM scan detail row */}
                {(event as any).llmScanned && (event as any).llmClassification !== "safe" && (
                  <tr className="bg-primary/[0.02] border-b border-border/30">
                    <td colSpan={7} className="px-4 py-2">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">LLM Analysis:</span>
                        <span className={`font-medium ${
                          (event as any).llmClassification === "malicious" ? "text-red-400" :
                          (event as any).llmClassification === "suspicious" ? "text-orange-400" : "text-green-400"
                        }`}>
                          {((event as any).llmClassification ?? "").charAt(0).toUpperCase() + ((event as any).llmClassification ?? "").slice(1)}
                        </span>
                        <span className="text-muted-foreground">
                          Confidence: {((event as any).llmConfidence * 100).toFixed(0)}%
                        </span>
                        {(event as any).llmIsJailbreak && (
                          <Badge variant="destructive" className="text-[10px] h-4">Jailbreak</Badge>
                        )}
                        {(event as any).llmIsObfuscatedInjection && (
                          <Badge variant="destructive" className="text-[10px] h-4">Obfuscated</Badge>
                        )}
                        {(event as any).llmIsDataExfiltration && (
                          <Badge variant="destructive" className="text-[10px] h-4">Data Exfil</Badge>
                        )}
                        {(event as any).llmAttackCategories?.length > 0 && (
                          <span className="text-muted-foreground">
                            Categories: {(event as any).llmAttackCategories.join(", ")}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page + 1} · Showing {events.data?.length ?? 0} events
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={(events.data?.length ?? 0) < limit}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Configuration Tab ──────────────────────────────────────────────

function ConfigTab({ projectId }: { projectId: number }) {
  const config = trpc.security.getConfig.useQuery({ projectId });
  const updateConfig = trpc.security.updateConfig.useMutation({
    onSuccess: () => {
      config.refetch();
      toast.success("Security configuration updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const [newKeyword, setNewKeyword] = useState("");

  if (config.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const c = config.data;
  if (!c) return null;

  const handleToggle = (field: string, value: boolean) => {
    updateConfig.mutate({ projectId, [field]: value });
  };

  const handleRedactionMode = (mode: string) => {
    updateConfig.mutate({ projectId, piiRedactionMode: mode as any });
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const current = (c.customKeywords as string[]) ?? [];
    if (current.includes(newKeyword.trim())) {
      toast.error("Keyword already exists");
      return;
    }
    updateConfig.mutate({
      projectId,
      customKeywords: [...current, newKeyword.trim()],
    });
    setNewKeyword("");
  };

  const removeKeyword = (keyword: string) => {
    const current = (c.customKeywords as string[]) ?? [];
    updateConfig.mutate({
      projectId,
      customKeywords: current.filter((k) => k !== keyword),
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Detection Modules */}
      <div>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Detection Modules
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">Prompt Injection Detection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scans for role hijacking, system prompt extraction, encoding attacks, and more
              </p>
            </div>
            <Switch
              checked={c.injectionDetection ?? true}
              onCheckedChange={(v) => handleToggle("injectionDetection", v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">PII Detection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detects emails, phone numbers, SSNs, credit cards, API keys, and other sensitive data
              </p>
            </div>
            <Switch
              checked={c.piiDetection ?? true}
              onCheckedChange={(v) => handleToggle("piiDetection", v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">Content Policy Enforcement</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enforces policies against harmful content, violence, illegal activities, and custom rules
              </p>
            </div>
            <Switch
              checked={c.contentPolicyEnabled ?? true}
              onCheckedChange={(v) => handleToggle("contentPolicyEnabled", v)}
            />
          </div>
        </div>
      </div>

      {/* Blocking */}
      <div>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400" />
          Threat Blocking
        </h3>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
          <div>
            <p className="text-sm font-medium">Block High-Threat Requests</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automatically block requests with a "high" threat level (returns 403 instead of forwarding)
            </p>
          </div>
          <Switch
            checked={c.blockHighThreats ?? false}
            onCheckedChange={(v) => handleToggle("blockHighThreats", v)}
          />
        </div>
      </div>

      {/* PII Redaction Mode */}
      <div>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-yellow-400" />
          PII Redaction Mode
        </h3>
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <p className="text-xs text-muted-foreground mb-3">
            Choose how detected PII is handled in logged traces
          </p>
          <Select
            value={c.piiRedactionMode ?? "none"}
            onValueChange={handleRedactionMode}
          >
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None — Log as-is (detection only)</SelectItem>
              <SelectItem value="mask">Mask — Replace with [REDACTED]</SelectItem>
              <SelectItem value="hash">Hash — Replace with SHA-256 hash</SelectItem>
              <SelectItem value="block">Block — Reject requests containing PII</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Output Scanning */}
      <div>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          Output Scanning (Response Side)
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">Enable Output Scanning</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scan LLM responses for PII leakage and toxic content before delivery
              </p>
            </div>
            <Switch
              checked={(c as any).outputScanning ?? false}
              onCheckedChange={(v) => handleToggle("outputScanning", v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">Output PII Detection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detect PII in model responses (emails, SSNs, credit cards, etc.)
              </p>
            </div>
            <Switch
              checked={(c as any).outputPiiDetection ?? true}
              onCheckedChange={(v) => handleToggle("outputPiiDetection", v)}
              disabled={!(c as any).outputScanning}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">Output Toxicity Detection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detect hate speech, harassment, self-harm, violence, and dangerous instructions
              </p>
            </div>
            <Switch
              checked={(c as any).outputToxicityDetection ?? true}
              onCheckedChange={(v) => handleToggle("outputToxicityDetection", v)}
              disabled={!(c as any).outputScanning}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">Block Toxic Responses</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Block responses with high output threat scores (non-streaming only; streaming events are logged)
              </p>
            </div>
            <Switch
              checked={(c as any).outputBlockThreats ?? false}
              onCheckedChange={(v) => handleToggle("outputBlockThreats", v)}
              disabled={!(c as any).outputScanning}
            />
          </div>
        </div>
      </div>

      {/* Custom Keywords */}
      <div>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          Custom Blocked Keywords
        </h3>
        <div className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
          <p className="text-xs text-muted-foreground">
            Add custom keywords or phrases that should be flagged in prompts
          </p>
          <div className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Enter keyword or phrase..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            />
            <Button size="sm" className="h-8 px-3" onClick={addKeyword}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          {((c.customKeywords as string[]) ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {((c.customKeywords as string[]) ?? []).map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "log", label: "Threat Log" },
  { id: "config", label: "Configuration" },
];

export default function SecurityDashboard({ projectId }: SecurityDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Security
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor threats, review security events, and configure protection policies
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab projectId={projectId} />}
      {activeTab === "log" && <ThreatLogTab projectId={projectId} />}
      {activeTab === "config" && <ConfigTab projectId={projectId} />}
    </div>
  );
}
