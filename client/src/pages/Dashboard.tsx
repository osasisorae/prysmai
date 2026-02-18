import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  DollarSign,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Format cost with enough precision to show meaningful values.
 * - >= $1:       "$1.23"
 * - >= $0.01:    "$0.0123"
 * - >= $0.0001:  "$0.000123"
 * - < $0.0001:   "< $0.0001" or show in scientific notation
 */
function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.0001) return `$${usd.toFixed(6)}`;
  // For very tiny amounts, show enough digits to be non-zero
  const str = usd.toFixed(8);
  // Trim trailing zeros but keep at least one significant digit visible
  const trimmed = str.replace(/0+$/, "");
  return `$${trimmed.endsWith(".") ? trimmed + "0" : trimmed}`;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  loading?: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveTraceRow({ trace }: { trace: any }) {
  const statusColor =
    trace.status === "success"
      ? "text-green-400"
      : trace.status === "error"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="flex items-center gap-4 py-2.5 px-3 text-sm border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
      <span className={`w-2 h-2 rounded-full shrink-0 ${
        trace.status === "success" ? "bg-green-400" : trace.status === "error" ? "bg-red-400" : "bg-yellow-400"
      }`} />
      <span className="text-muted-foreground text-xs w-16 shrink-0">
        {new Date(trace.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <span className="font-mono text-xs truncate flex-1">{trace.model}</span>
      <span className="text-xs text-muted-foreground w-16 text-right">{trace.latencyMs ?? "—"}ms</span>
      <span className="text-xs text-muted-foreground w-16 text-right">{trace.totalTokens ?? 0} tok</span>
      <span className={`text-xs w-14 text-right ${statusColor}`}>
        {trace.status}
      </span>
    </div>
  );
}

export default function DashboardOverview({ projectId }: { projectId: number }) {
  const [timeRange, setTimeRange] = useState("7d");

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (timeRange === "all") {
      return {
        from: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000),
        to: now,
      };
    }
    const ranges: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    return {
      from: new Date(now.getTime() - (ranges[timeRange] ?? ranges["7d"])),
      to: now,
    };
  }, [timeRange]);

  const metrics = trpc.metrics.overview.useQuery(
    { projectId, from, to },
    { refetchInterval: 15000 }
  );

  const timeline = trpc.metrics.timeline.useQuery(
    { projectId, from, to },
    { refetchInterval: 15000 }
  );

  const recentTraces = trpc.trace.list.useQuery(
    { projectId, limit: 15 },
    { refetchInterval: 5000 }
  );

  const summary = metrics.data?.summary;
  const totalRequests = Number(summary?.totalRequests ?? 0);
  const totalCostRaw = parseFloat(summary?.totalCost ?? "0");
  const avgLatency = Math.round(Number(summary?.avgLatency ?? 0));
  const errorCount = Number(summary?.errorCount ?? 0);
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(1) : "0";

  // Check if there are any traces at all (from the live feed, which has no time filter)
  const hasAnyTraces = (recentTraces.data?.traces?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time metrics from your proxy traffic</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last hour</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          icon={Activity}
          loading={metrics.isLoading}
        />
        <MetricCard
          title="Total Cost"
          value={formatCost(totalCostRaw)}
          icon={DollarSign}
          loading={metrics.isLoading}
        />
        <MetricCard
          title="Avg Latency"
          value={`${avgLatency}ms`}
          icon={Clock}
          loading={metrics.isLoading}
        />
        <MetricCard
          title="Error Rate"
          value={`${errorRate}%`}
          subtitle={`${errorCount} errors`}
          icon={AlertTriangle}
          loading={metrics.isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Request Timeline */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Request Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : timeline.data && timeline.data.length > 0 ? (
              <div className="space-y-2">
                <div className="h-36 flex items-end gap-1">
                  {timeline.data.map((bucket: any, i: number) => {
                    const maxCount = Math.max(...timeline.data!.map((b: any) => Number(b.count)));
                    const height = maxCount > 0 ? (Number(bucket.count) / maxCount) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary/70 rounded-t hover:bg-primary transition-colors relative group"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {bucket.count} req
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(timeline.data[0].bucket).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  <span>{new Date(timeline.data[timeline.data.length - 1].bucket).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            ) : hasAnyTraces ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <p>No requests in this time range.</p>
                  <p className="text-xs mt-1">Try selecting a wider range above.</p>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No data yet. Send requests through the proxy to see metrics.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" /> Model Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : metrics.data?.modelBreakdown && metrics.data.modelBreakdown.length > 0 ? (
              <div className="space-y-3">
                {metrics.data.modelBreakdown.map((m: any, i: number) => {
                  const total = metrics.data!.modelBreakdown.reduce(
                    (sum: number, b: any) => sum + Number(b.count),
                    0
                  );
                  const pct = total > 0 ? (Number(m.count) / total) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono text-xs">{m.model}</span>
                        <span className="text-muted-foreground text-xs">
                          {m.count} req · {formatCost(parseFloat(m.totalCost))}
                        </span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hasAnyTraces ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <p>No model data in this time range.</p>
                  <p className="text-xs mt-1">Try selecting a wider range above.</p>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No model data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Trace Feed */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" /> Live Request Feed
            </CardTitle>
            <span className="text-xs text-muted-foreground">Auto-refreshing every 5s</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentTraces.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recentTraces.data?.traces && recentTraces.data.traces.length > 0 ? (
            <div>
              {/* Header */}
              <div className="flex items-center gap-4 py-2 px-3 text-xs text-muted-foreground border-b border-border font-medium">
                <span className="w-2 shrink-0" />
                <span className="w-16 shrink-0">Time</span>
                <span className="flex-1">Model</span>
                <span className="w-16 text-right">Latency</span>
                <span className="w-16 text-right">Tokens</span>
                <span className="w-14 text-right">Status</span>
              </div>
              {recentTraces.data.traces.map((trace: any) => (
                <LiveTraceRow key={trace.id} trace={trace} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No requests yet</p>
              <p className="text-xs mt-1">Send your first request through the proxy to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
