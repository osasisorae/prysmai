/**
 * Financial Anomaly Detection Dashboard
 * 
 * Displays cost spikes, budget overruns, velocity anomalies, and cumulative cost alerts.
 * Tabs: Overview (summary metrics + chart) | Alert Log (paginated table) | Configuration
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  halt: "bg-red-600/10 text-red-300 border-red-600/30",
};

const TYPE_LABELS: Record<string, string> = {
  cost_spike: "Cost Spike",
  budget_exceeded: "Budget Exceeded",
  velocity_anomaly: "Velocity Anomaly",
  cumulative_overrun: "Cumulative Overrun",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function FinancialAnomalies({ projectId }: Props) {
  const [tab, setTab] = useState<"overview" | "alerts">("overview");
  const [alertType, setAlertType] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const summary = trpc.detectors.getFinancialSummary.useQuery(
    { projectId },
    { staleTime: 30_000 }
  );

  const alerts = trpc.detectors.listFinancialAlerts.useQuery(
    {
      projectId,
      alertType: alertType !== "all" ? alertType as any : undefined,
      severity: severity !== "all" ? severity as any : undefined,
      status: status !== "all" ? status as any : undefined,
      limit,
      offset: page * limit,
    },
    { staleTime: 15_000 }
  );

  const resolve = trpc.detectors.resolveFinancialAlert.useMutation({
    onSuccess: () => {
      toast.success("Alert updated");
      alerts.refetch();
      summary.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalAlerts = summary.data?.byType?.reduce((sum, t) => sum + t.count, 0) ?? 0;
  const openAlerts = summary.data?.openAlerts ?? 0;
  const criticalCount = summary.data?.bySeverity?.find(s => s.severity === "critical")?.count ?? 0;
  const haltCount = summary.data?.bySeverity?.find(s => s.severity === "halt")?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          Financial Anomaly Detection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor cost trajectories, detect budget overruns, and halt runaway agent spending.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "alerts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" ? "Overview" : "Alert Log"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Alerts"
              value={totalAlerts}
              icon={<AlertTriangle className="w-4 h-4" />}
              loading={summary.isLoading}
            />
            <MetricCard
              label="Open Alerts"
              value={openAlerts}
              icon={<Eye className="w-4 h-4" />}
              loading={summary.isLoading}
              highlight={openAlerts > 0}
            />
            <MetricCard
              label="Critical"
              value={criticalCount}
              icon={<ShieldAlert className="w-4 h-4" />}
              loading={summary.isLoading}
              highlight={criticalCount > 0}
            />
            <MetricCard
              label="Halted"
              value={haltCount}
              icon={<XCircle className="w-4 h-4" />}
              loading={summary.isLoading}
              highlight={haltCount > 0}
            />
          </div>

          {/* Breakdown by Type */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Alerts by Type</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.byType?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No financial alerts detected. Your agents are operating within budget.</p>
            ) : (
              <div className="space-y-3">
                {summary.data?.byType?.map((t) => (
                  <div key={t.alertType} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[t.alertType] ?? t.alertType}</Badge>
                      <span className="text-sm text-muted-foreground">{t.count} alert{t.count !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="text-sm font-mono">{formatCents(Number(t.totalCost) || 0)} total</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Severity Breakdown */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Severity Distribution</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.bySeverity?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No alerts to display.</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {summary.data?.bySeverity?.map((s) => (
                  <div key={s.severity} className={`px-4 py-2 rounded-lg border ${SEVERITY_COLORS[s.severity] ?? "bg-muted"}`}>
                    <span className="text-lg font-bold">{s.count}</span>
                    <span className="text-xs ml-2 capitalize">{s.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={alertType} onValueChange={v => { setAlertType(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Alert Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cost_spike">Cost Spike</SelectItem>
                <SelectItem value="budget_exceeded">Budget Exceeded</SelectItem>
                <SelectItem value="velocity_anomaly">Velocity Anomaly</SelectItem>
                <SelectItem value="cumulative_overrun">Cumulative Overrun</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={v => { setSeverity(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="halt">Halt</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert Table */}
          {alerts.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (alerts.data?.alerts?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No financial alerts found matching your filters.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 font-medium">Cost</th>
                    <th className="text-left px-4 py-3 font-medium">Deviation</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {alerts.data?.alerts?.map((alert) => (
                    <tr key={alert.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{TYPE_LABELS[alert.alertType] ?? alert.alertType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[alert.severity]}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{formatCents(alert.currentCostCents)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {alert.deviationPercent ? `+${alert.deviationPercent}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs capitalize ${alert.status === "open" ? "text-amber-400" : "text-muted-foreground"}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(alert.detectedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {alert.status === "open" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ alertId: alert.id, status: "acknowledged" })}
                              disabled={resolve.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" /> Ack
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ alertId: alert.id, status: "resolved" })}
                              disabled={resolve.isPending}
                            >
                              Resolve
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {(alerts.data?.total ?? 0) > limit && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, alerts.data?.total ?? 0)} of {alerts.data?.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * limit >= (alerts.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, loading, highlight }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? "border-amber-500/30 bg-amber-500/5" : "border-border"}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <span className="text-2xl font-bold">{value}</span>
      )}
    </div>
  );
}
