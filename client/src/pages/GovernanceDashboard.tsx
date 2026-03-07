/**
 * Governance Dashboard — Aggregate metrics, behavior trends, and detector breakdown.
 *
 * Shows:
 *   - Top-level KPI cards (total sessions, active, avg score, violations)
 *   - Behavior score trend chart (daily)
 *   - Outcome breakdown
 *   - Agent type distribution
 *   - Detector trigger rates
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Shield,
  Brain,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Zap,
} from "lucide-react";

// ─── Helpers ───

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  valueColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  loading?: boolean;
  valueColor?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className={`text-2xl font-bold font-mono ${valueColor ?? "text-foreground"}`}>
                {value}
              </p>
            )}
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Simple Bar Chart (CSS-based) ───

function BarChart({
  data,
  maxValue,
  colorFn,
}: {
  data: Array<{ label: string; value: number }>;
  maxValue?: number;
  colorFn?: (label: string) => string;
}) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-24 truncate text-right">{d.label}</span>
          <div className="flex-1 h-5 bg-background/50 rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                backgroundColor: colorFn?.(d.label) ?? "oklch(0.75 0.15 195)",
              }}
            />
          </div>
          <span className="text-xs font-mono text-foreground w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Sparkline (CSS-based) ───

function Sparkline({ data, height = 60 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {data.map((v, i) => {
        const h = Math.max(((v - min) / range) * height, 2);
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all duration-300"
            style={{
              height: h,
              backgroundColor:
                v >= 80
                  ? "oklch(0.72 0.17 155)"
                  : v >= 60
                  ? "oklch(0.82 0.16 80)"
                  : "oklch(0.65 0.22 25)",
              opacity: 0.8,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main Component ───

export default function GovernanceDashboard({ projectId }: { projectId: number }) {
  const [days, setDays] = useState(30);

  const now = useMemo(() => Date.now(), []);
  const from = useMemo(() => now - days * 24 * 60 * 60 * 1000, [days, now]);

  const metrics = trpc.governance.getMetrics.useQuery({
    projectId,
    from,
    to: now,
  });

  const trends = trpc.governance.getBehaviorTrends.useQuery({
    projectId,
    days,
  });

  const detectors = trpc.governance.getDetectorBreakdown.useQuery({
    projectId,
    limit: 50,
  });

  const isLoading = metrics.isLoading;

  // Outcome color mapping
  const outcomeColors: Record<string, string> = {
    completed: "oklch(0.72 0.17 155)",
    failed: "oklch(0.65 0.22 25)",
    partial: "oklch(0.82 0.16 80)",
    timeout: "oklch(0.75 0.15 60)",
    unknown: "oklch(0.5 0.01 260)",
  };

  // Agent color mapping
  const agentColors: Record<string, string> = {
    claude_code: "oklch(0.75 0.15 195)",
    manus: "oklch(0.72 0.17 155)",
    kiro: "oklch(0.82 0.16 80)",
    codex: "oklch(0.65 0.22 25)",
    langchain: "oklch(0.7 0.15 280)",
    crewai: "oklch(0.75 0.12 330)",
    custom: "oklch(0.5 0.01 260)",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Governance Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Behavioral health and compliance overview
          </p>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-32 h-9 text-sm bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Sessions"
          value={metrics.data?.totalSessions?.toString() ?? "0"}
          icon={Activity}
          loading={isLoading}
        />
        <MetricCard
          title="Active Sessions"
          value={metrics.data?.activeSessions?.toString() ?? "0"}
          icon={Zap}
          loading={isLoading}
          valueColor="text-primary"
        />
        <MetricCard
          title="Avg Behavior Score"
          value={metrics.data?.avgBehaviorScore?.toString() ?? "—"}
          icon={Brain}
          loading={isLoading}
          valueColor={scoreColor(metrics.data?.avgBehaviorScore)}
        />
        <MetricCard
          title="Violations"
          value={metrics.data?.totalViolations?.toString() ?? "0"}
          icon={AlertTriangle}
          loading={isLoading}
          valueColor={
            (metrics.data?.totalViolations ?? 0) > 0 ? "text-red-400" : "text-green-400"
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Behavior Score Trend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Behavior Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trends.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : trends.data?.trends && trends.data.trends.length > 0 ? (
              <div>
                <Sparkline data={trends.data.trends.map((t) => t.avgScore)} height={64} />
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{trends.data.trends[0]?.date}</span>
                  <span>{trends.data.trends[trends.data.trends.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No trend data available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Outcome Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Session Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : metrics.data?.outcomeBreakdown && metrics.data.outcomeBreakdown.length > 0 ? (
              <BarChart
                data={metrics.data.outcomeBreakdown.map((o) => ({
                  label: o.outcome,
                  value: o.count,
                }))}
                colorFn={(label) => outcomeColors[label] ?? "oklch(0.5 0.01 260)"}
              />
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No session data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agent Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Agent Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : metrics.data?.agentBreakdown && metrics.data.agentBreakdown.length > 0 ? (
              <BarChart
                data={metrics.data.agentBreakdown.map((a) => ({
                  label: a.agentType,
                  value: a.count,
                }))}
                colorFn={(label) => agentColors[label] ?? "oklch(0.5 0.01 260)"}
              />
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No agent data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Detector Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Detector Trigger Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detectors.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : detectors.data?.detectors && detectors.data.detectors.length > 0 ? (
              <div className="space-y-3">
                {detectors.data.detectors.map((d) => (
                  <div key={d.detectorId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{d.detectorId.replace(/-/g, " ")}</span>
                      <span className="font-mono text-foreground">
                        {d.triggerRate}%{" "}
                        <span className="text-muted-foreground">
                          ({d.triggeredCount}/{d.totalAssessments})
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${d.triggerRate}%`,
                          backgroundColor:
                            d.triggerRate > 50
                              ? "oklch(0.65 0.22 25)"
                              : d.triggerRate > 25
                              ? "oklch(0.82 0.16 80)"
                              : "oklch(0.72 0.17 155)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No detector data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
