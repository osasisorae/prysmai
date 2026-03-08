/**
 * Tool Performance Dashboard — Phase 2
 *
 * Dedicated view for tool execution metrics:
 *   - Aggregate metrics table (success rate, latency, call count)
 *   - Latency distribution chart per tool
 *   - Tool call timeline scatter plot
 *   - Failure analysis
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  AlertTriangle,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  Legend,
} from "recharts";

interface ToolPerformanceProps {
  projectId: number;
}

// ─── Helpers ───

function formatMs(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function rateColor(rate: number): string {
  if (rate >= 0.95) return "text-green-400";
  if (rate >= 0.8) return "text-amber-400";
  return "text-red-400";
}

function rateBg(rate: number): string {
  if (rate >= 0.95) return "bg-green-500/10 border-green-500/20";
  if (rate >= 0.8) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

// ─── Time Range Selector ───

const TIME_RANGES = [
  { label: "Last 24h", value: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "Last 7d", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 30d", value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "All time", value: "all", ms: 0 },
];

export default function ToolPerformance({ projectId }: ToolPerformanceProps) {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const range = TIME_RANGES.find((r) => r.value === timeRange) ?? TIME_RANGES[1];
  const from = range.ms > 0 ? Date.now() - range.ms : undefined;

  // ─── Queries ───

  const perfQuery = trpc.unifiedTrace.getToolPerformance.useQuery(
    { projectId, from, limit: 50 },
    { staleTime: 30_000 }
  );

  const timelineQuery = trpc.unifiedTrace.getToolCallTimeline.useQuery(
    { projectId, toolName: selectedTool ?? undefined, from, limit: 500 },
    { staleTime: 30_000 }
  );

  const metrics = perfQuery.data ?? [];
  const timeline = timelineQuery.data ?? [];

  // ─── Derived Data ───

  const totalCalls = useMemo(() => metrics.reduce((s, m) => s + m.totalCalls, 0), [metrics]);
  const totalFailures = useMemo(() => metrics.reduce((s, m) => s + m.failureCount, 0), [metrics]);
  const overallSuccessRate = useMemo(
    () => (totalCalls > 0 ? (totalCalls - totalFailures) / totalCalls : 1),
    [totalCalls, totalFailures]
  );
  const avgLatency = useMemo(() => {
    const total = metrics.reduce((s, m) => s + m.avgLatencyMs * m.totalCalls, 0);
    return totalCalls > 0 ? Math.round(total / totalCalls) : 0;
  }, [metrics, totalCalls]);

  // Chart data for bar chart
  const barData = useMemo(
    () =>
      metrics.slice(0, 15).map((m) => ({
        name: m.toolName.length > 20 ? m.toolName.slice(0, 18) + "…" : m.toolName,
        fullName: m.toolName,
        calls: m.totalCalls,
        successRate: Math.round(m.successRate * 100),
        avgLatency: m.avgLatencyMs,
        failures: m.failureCount,
      })),
    [metrics]
  );

  // Scatter data for timeline
  const scatterData = useMemo(
    () =>
      timeline.map((t) => ({
        x: t.eventTimestamp,
        y: t.toolDurationMs ?? 0,
        name: t.toolName,
        success: t.toolSuccess,
        session: t.sessionId,
      })),
    [timeline]
  );

  // ─── Loading State ───

  if (perfQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Tool Performance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Loading tool metrics...</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Tool Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor tool execution metrics, success rates, and latency patterns
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Wrench className="w-3.5 h-3.5" />
              Total Tool Calls
            </div>
            <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.length} unique tools</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Success Rate
            </div>
            <p className={`text-2xl font-bold ${rateColor(overallSuccessRate)}`}>
              {formatPercent(overallSuccessRate)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{totalFailures} failures</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Avg Latency
            </div>
            <p className="text-2xl font-bold">{formatMs(avgLatency)}</p>
            <p className="text-xs text-muted-foreground mt-1">across all tools</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Slowest Tool
            </div>
            <p className="text-2xl font-bold">
              {metrics.length > 0
                ? formatMs(Math.max(...metrics.map((m) => m.maxLatencyMs)))
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {metrics.length > 0
                ? metrics.reduce((a, b) => (a.maxLatencyMs > b.maxLatencyMs ? a : b)).toolName
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tool Metrics Table + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Calls by Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No tool calls recorded in this period
              </div>
            ) : (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "calls") return [value, "Total Calls"];
                        if (name === "failures") return [value, "Failures"];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="failures" fill="hsl(0 70% 50%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metrics Table */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Tool Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No tool calls recorded in this period
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-3">Tool</th>
                      <th className="text-right py-2 px-2">Calls</th>
                      <th className="text-right py-2 px-2">Success</th>
                      <th className="text-right py-2 px-2">Avg Latency</th>
                      <th className="text-right py-2 pl-2">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr
                        key={m.toolName}
                        className={`border-b border-border/50 cursor-pointer transition-colors ${
                          selectedTool === m.toolName ? "bg-primary/10" : "hover:bg-accent/30"
                        }`}
                        onClick={() =>
                          setSelectedTool(selectedTool === m.toolName ? null : m.toolName)
                        }
                      >
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[140px]" title={m.toolName}>
                              {m.toolName}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums">{m.totalCalls}</td>
                        <td className="text-right py-2 px-2">
                          <span className={rateColor(m.successRate)}>
                            {formatPercent(m.successRate)}
                          </span>
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums">{formatMs(m.avgLatencyMs)}</td>
                        <td className="text-right py-2 pl-2 tabular-nums">{formatMs(m.maxLatencyMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tool Call Timeline Scatter */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {selectedTool ? `${selectedTool} — Latency Timeline` : "All Tools — Latency Timeline"}
            </CardTitle>
            {selectedTool && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setSelectedTool(null)}
              >
                Clear filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {scatterData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              {timelineQuery.isLoading ? "Loading timeline..." : "No tool calls to display"}
            </div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={["auto", "auto"]}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    }
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Latency"
                    unit="ms"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "y") return [`${value}ms`, "Latency"];
                      return [value, name];
                    }}
                    labelFormatter={(v) => new Date(v as number).toLocaleString()}
                  />
                  <Scatter data={scatterData} name="Tool Calls">
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.success ? "hsl(var(--primary))" : "hsl(0 70% 50%)"}
                        opacity={0.7}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failure Analysis */}
      {totalFailures > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              Failure Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics
                .filter((m) => m.failureCount > 0)
                .sort((a, b) => b.failureCount - a.failureCount)
                .slice(0, 10)
                .map((m) => (
                  <div
                    key={m.toolName}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${m.successRate < 0.8 ? "bg-red-400" : "bg-amber-400"}`} />
                      <span className="text-sm">{m.toolName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {m.failureCount} / {m.totalCalls} failed
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${rateBg(m.successRate)} ${rateColor(m.successRate)}`}
                      >
                        {formatPercent(m.successRate)}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
