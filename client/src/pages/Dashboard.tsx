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
  BarChart3,
  ShieldAlert,
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
 */
function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.0001) return `$${usd.toFixed(6)}`;
  const str = usd.toFixed(8);
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

/** Simple bar chart component for reuse */
function BarChartSimple({
  data,
  getHeight,
  getLabel,
  getTooltip,
  barColor = "bg-primary/70",
  barHoverColor = "bg-primary",
}: {
  data: any[];
  getHeight: (item: any, max: number) => number;
  getLabel?: (item: any, i: number) => string;
  getTooltip: (item: any) => string;
  barColor?: string;
  barHoverColor?: string;
}) {
  const maxVal = Math.max(...data.map((d, i) => getHeight(d, 1)));
  return (
    <div className="space-y-2">
      <div className="h-36 flex items-end gap-1">
        {data.map((item: any, i: number) => {
          const height = maxVal > 0 ? (getHeight(item, 1) / maxVal) * 100 : 0;
          return (
            <div
              key={i}
              className={`flex-1 ${barColor} rounded-t hover:${barHoverColor} transition-colors relative group`}
              style={{ height: `${Math.max(height, 4)}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {getTooltip(item)}
              </div>
            </div>
          );
        })}
      </div>
      {getLabel && data.length > 0 && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{getLabel(data[0], 0)}</span>
          <span>{getLabel(data[data.length - 1], data.length - 1)}</span>
        </div>
      )}
    </div>
  );
}

function EmptyChart({ hasAnyTraces, message }: { hasAnyTraces: boolean; message?: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
      {hasAnyTraces ? (
        <div className="text-center">
          <p>{message ?? "No data in this time range."}</p>
          <p className="text-xs mt-1">Try selecting a wider range above.</p>
        </div>
      ) : (
        "No data yet. Send requests through the proxy to see metrics."
      )}
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

  const latencyDist = trpc.metrics.latencyDistribution.useQuery(
    { projectId, from, to },
    { refetchInterval: 30000 }
  );

  const percentiles = trpc.metrics.percentiles.useQuery(
    { projectId, from, to },
    { refetchInterval: 30000 }
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

  const hasAnyTraces = (recentTraces.data?.traces?.length ?? 0) > 0;

  // Compute cumulative cost from timeline data
  const costAccumulation = useMemo(() => {
    if (!timeline.data || timeline.data.length === 0) return [];
    let running = 0;
    return timeline.data.map((b: any) => {
      running += parseFloat(b.totalCost || "0");
      return { bucket: b.bucket, cumulativeCost: running };
    });
  }, [timeline.data]);

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
          subtitle={percentiles.data ? `p50: ${percentiles.data.p50}ms · p95: ${percentiles.data.p95}ms · p99: ${percentiles.data.p99}ms` : undefined}
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

      {/* Charts row 1: Request Volume + Error Rate */}
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
              <BarChartSimple
                data={timeline.data}
                getHeight={(item) => Number(item.count)}
                getLabel={(item) => new Date(item.bucket).toLocaleDateString([], { month: "short", day: "numeric" })}
                getTooltip={(item) => `${item.count} req`}
              />
            ) : (
              <EmptyChart hasAnyTraces={hasAnyTraces} message="No requests in this time range." />
            )}
          </CardContent>
        </Card>

        {/* Error Rate Over Time */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Error Rate Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : timeline.data && timeline.data.length > 0 ? (
              (() => {
                const errorData = timeline.data.map((b: any) => ({
                  bucket: b.bucket,
                  errorRate: Number(b.count) > 0 ? (Number(b.errorCount) / Number(b.count)) * 100 : 0,
                  errorCount: Number(b.errorCount),
                  total: Number(b.count),
                }));
                const hasErrors = errorData.some((d: any) => d.errorCount > 0);
                return hasErrors ? (
                  <BarChartSimple
                    data={errorData}
                    getHeight={(item) => item.errorRate}
                    getLabel={(item) => new Date(item.bucket).toLocaleDateString([], { month: "short", day: "numeric" })}
                    getTooltip={(item) => `${item.errorRate.toFixed(1)}% (${item.errorCount}/${item.total})`}
                    barColor="bg-red-500/70"
                    barHoverColor="bg-red-500"
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                    <div className="text-center">
                      <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      <p className="text-green-400 font-medium">0% error rate</p>
                      <p className="text-xs mt-1">All requests succeeded in this period</p>
                    </div>
                  </div>
                );
              })()
            ) : (
              <EmptyChart hasAnyTraces={hasAnyTraces} message="No error data in this time range." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Latency Histogram + Cost Accumulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Latency Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latencyDist.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : latencyDist.data && latencyDist.data.length > 0 ? (
              <div className="space-y-2">
                <div className="h-36 flex items-end gap-2">
                  {latencyDist.data.map((bucket: any, i: number) => {
                    const maxCount = Math.max(...latencyDist.data!.map((b: any) => Number(b.count)));
                    const height = maxCount > 0 ? (Number(bucket.count) / maxCount) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center" style={{ height: "128px" }}>
                          <div
                            className="w-full bg-cyan-500/70 rounded-t hover:bg-cyan-500 transition-colors relative group"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {bucket.count} req
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{bucket.bucket}ms</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyChart hasAnyTraces={hasAnyTraces} message="No latency data in this time range." />
            )}
          </CardContent>
        </Card>

        {/* Cost Accumulation */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Cumulative Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : costAccumulation.length > 0 ? (
              <div className="space-y-2">
                {/* SVG line chart for cumulative cost */}
                <div className="h-36 relative">
                  <svg viewBox="0 0 400 140" className="w-full h-full" preserveAspectRatio="none">
                    {(() => {
                      const maxCost = Math.max(...costAccumulation.map((d: any) => d.cumulativeCost));
                      if (maxCost === 0) return null;
                      const points = costAccumulation.map((d: any, i: number) => {
                        const x = costAccumulation.length > 1 ? (i / (costAccumulation.length - 1)) * 400 : 200;
                        const y = 135 - (d.cumulativeCost / maxCost) * 130;
                        return `${x},${y}`;
                      });
                      const areaPoints = `0,135 ${points.join(" ")} 400,135`;
                      return (
                        <>
                          <polygon points={areaPoints} fill="oklch(0.78 0.17 195 / 0.15)" />
                          <polyline
                            points={points.join(" ")}
                            fill="none"
                            stroke="oklch(0.78 0.17 195)"
                            strokeWidth="2"
                          />
                          {/* End point dot */}
                          {costAccumulation.length > 0 && (() => {
                            const last = costAccumulation[costAccumulation.length - 1];
                            const x = 400;
                            const y = 135 - (last.cumulativeCost / maxCost) * 130;
                            return <circle cx={x} cy={y} r="3" fill="oklch(0.78 0.17 195)" />;
                          })()}
                        </>
                      );
                    })()}
                  </svg>
                  {/* Total label */}
                  <div className="absolute top-2 right-2 text-xs font-mono text-primary">
                    {formatCost(costAccumulation[costAccumulation.length - 1]?.cumulativeCost ?? 0)}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(costAccumulation[0].bucket).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  <span>{new Date(costAccumulation[costAccumulation.length - 1].bucket).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            ) : (
              <EmptyChart hasAnyTraces={hasAnyTraces} message="No cost data in this time range." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3: Model Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            ) : (
              <EmptyChart hasAnyTraces={hasAnyTraces} message="No model data in this time range." />
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
