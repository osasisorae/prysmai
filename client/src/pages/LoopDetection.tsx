/**
 * Agent Loop Detection Dashboard
 * 
 * Displays circular tool call patterns, repetitive state transitions, and circuit breaker events.
 * Tabs: Overview (summary metrics) | Loop Log (paginated table)
 */

import React, { useState } from "react";
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
  Repeat,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Zap,
  RotateCcw,
  CircleOff,
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

const LOOP_TYPE_LABELS: Record<string, string> = {
  tool_cycle: "Tool Cycle",
  state_repetition: "State Repetition",
  output_repetition: "Output Repetition",
  circuit_breaker: "Circuit Breaker Triggered",
};

const LOOP_TYPE_ICONS: Record<string, React.ReactNode> = {
  tool_cycle: <RotateCcw className="w-4 h-4" />,
  state_repetition: <Repeat className="w-4 h-4" />,
  output_repetition: <Repeat className="w-4 h-4" />,
  circuit_breaker: <CircleOff className="w-4 h-4" />,
};

export default function LoopDetection({ projectId }: Props) {
  const [tab, setTab] = useState<"overview" | "loops">("overview");
  const [loopType, setLoopType] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const summary = trpc.detectors.getLoopSummary.useQuery(
    { projectId },
    { staleTime: 30_000 }
  );

  const loops = trpc.detectors.listLoopDetections.useQuery(
    {
      projectId,
      loopType: loopType !== "all" ? loopType as any : undefined,
      severity: severity !== "all" ? severity as any : undefined,
      status: status !== "all" ? status as any : undefined,
      limit,
      offset: page * limit,
    },
    { staleTime: 15_000 }
  );

  const resolve = trpc.detectors.resolveLoopDetection.useMutation({
    onSuccess: () => {
      toast.success("Loop detection updated");
      loops.refetch();
      summary.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalLoops = summary.data?.byType?.reduce((sum, t) => sum + t.count, 0) ?? 0;
  const circuitBreakers = summary.data?.circuitBreakersTriggered ?? 0;
  const highRepCount = summary.data?.byType?.reduce((sum, t) => sum + (t.avgRepetitions > 5 ? t.count : 0), 0) ?? 0;
  const recentCount = summary.data?.recentDetections?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Repeat className="w-6 h-6 text-primary" />
          Agent Loop Detection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detect circular tool call patterns, repetitive state transitions, and trigger circuit breakers to halt runaway agents.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "loops"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" ? "Overview" : "Loop Log"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Loops Detected" value={totalLoops} icon={<Repeat className="w-4 h-4" />} loading={summary.isLoading} />
            <MetricCard label="Recent" value={recentCount} icon={<AlertTriangle className="w-4 h-4" />} loading={summary.isLoading} highlight={recentCount > 0} />
            <MetricCard label="Circuit Breakers" value={circuitBreakers} icon={<Zap className="w-4 h-4" />} loading={summary.isLoading} highlight={circuitBreakers > 0} />
            <MetricCard label="High Repetition" value={highRepCount} icon={<CircleOff className="w-4 h-4" />} loading={summary.isLoading} highlight={highRepCount > 0} />
          </div>

          {/* By Type */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Detections by Type</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.byType?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No loop patterns detected. Your agents are executing linearly.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.data?.byType?.map((t) => (
                  <div key={t.loopType} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      {LOOP_TYPE_ICONS[t.loopType]}
                      <span className="text-sm">{LOOP_TYPE_LABELS[t.loopType] ?? t.loopType}</span>
                    </div>
                    <Badge variant="outline">{t.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Patterns */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Recent Loop Detections</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.recentDetections?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No patterns to display.</p>
            ) : (
              <div className="space-y-2">
                {summary.data?.recentDetections?.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-mono text-muted-foreground truncate max-w-[400px]">{Array.isArray(d.pattern) ? d.pattern.join(" → ") : String(d.pattern)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{d.repetitionCount} repetitions</span>
                      <Badge variant="outline">{d.loopType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "loops" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={loopType} onValueChange={v => { setLoopType(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Loop Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tool_cycle">Tool Cycle</SelectItem>
                <SelectItem value="state_repetition">State Repetition</SelectItem>
                <SelectItem value="output_repetition">Output Repetition</SelectItem>
                <SelectItem value="circuit_breaker">Circuit Breaker</SelectItem>
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

          {/* Loop Table */}
          {loops.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (loops.data?.detections?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Repeat className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No loop detections found matching your filters.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Pattern</th>
                    <th className="text-left px-4 py-3 font-medium">Iterations</th>
                    <th className="text-left px-4 py-3 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loops.data?.detections?.map((loop) => (
                    <tr key={loop.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {LOOP_TYPE_ICONS[loop.loopType]}
                          <span className="text-xs">{LOOP_TYPE_LABELS[loop.loopType] ?? loop.loopType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]">{loop.pattern || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{loop.repetitionCount}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[loop.severity]}`}>
                          {loop.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs capitalize ${loop.status === "open" ? "text-amber-400" : "text-muted-foreground"}`}>
                          {loop.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(loop.detectedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {loop.status === "open" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ detectionId: loop.id, status: "acknowledged" })}
                              disabled={resolve.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" /> Ack
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ detectionId: loop.id, status: "resolved" })}
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
          {(loops.data?.total ?? 0) > limit && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, loops.data?.total ?? 0)} of {loops.data?.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * limit >= (loops.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>
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
