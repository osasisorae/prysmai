/**
 * Multi-Agent Coordination Monitor Dashboard
 * 
 * Tracks inter-agent communication, detects conflicting instructions,
 * circular delegations, and provides a unified agent network view.
 * Tabs: Overview (summary) | Event Log (paginated) | Network (agent topology)
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
  Network,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  ArrowRight,
  Users,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  unexpected_agent: "Unexpected Agent",
  circular_delegation: "Circular Delegation",
  deep_delegation: "Deep Delegation",
  instruction_conflict: "Instruction Conflict",
  orphaned_delegation: "Orphaned Delegation",
  communication: "Communication",
};

export default function MultiAgentMonitor({ projectId }: Props) {
  const [tab, setTab] = useState<"overview" | "events" | "network">("overview");
  const [eventType, setEventType] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const summary = trpc.detectors.getMultiAgentSummary.useQuery(
    { projectId },
    { staleTime: 30_000 }
  );

  const events = trpc.detectors.listMultiAgentEvents.useQuery(
    {
      projectId,
      eventType: eventType !== "all" ? eventType as any : undefined,
      severity: severity !== "all" ? severity as any : undefined,
      status: status !== "all" ? status as any : undefined,
      limit,
      offset: page * limit,
    },
    { staleTime: 15_000, enabled: tab === "events" }
  );

  const network = trpc.detectors.getAgentNetwork.useQuery(
    { projectId },
    { staleTime: 60_000, enabled: tab === "network" }
  );

  const resolve = trpc.detectors.resolveMultiAgentEvent.useMutation({
    onSuccess: () => {
      toast.success("Event updated");
      events.refetch();
      summary.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalEvents = summary.data?.byType?.reduce((sum, t) => sum + t.count, 0) ?? 0;
  const criticalCount = summary.data?.bySeverity?.find(s => s.severity === "critical")?.count ?? 0;
  const warningCount = summary.data?.bySeverity?.find(s => s.severity === "warning")?.count ?? 0;
  const agentCount = summary.data?.topAgents?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Network className="w-6 h-6 text-primary" />
          Multi-Agent Coordination Monitor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track inter-agent communication, detect conflicting instructions, circular delegations, and view agent network topology.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "events", "network"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" ? "Overview" : t === "events" ? "Event Log" : "Agent Network"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Events" value={totalEvents} icon={<Zap className="w-4 h-4" />} loading={summary.isLoading} />
            <MetricCard label="Critical" value={criticalCount} icon={<ShieldAlert className="w-4 h-4" />} loading={summary.isLoading} highlight={criticalCount > 0} />
            <MetricCard label="Warnings" value={warningCount} icon={<AlertTriangle className="w-4 h-4" />} loading={summary.isLoading} highlight={warningCount > 0} />
            <MetricCard label="Agents Tracked" value={agentCount} icon={<Users className="w-4 h-4" />} loading={summary.isLoading} />
          </div>

          {/* By Event Type */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Events by Type</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.byType?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No multi-agent coordination events detected. Your agents are operating independently.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.data?.byType?.map((t) => (
                  <div key={t.eventType} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[t.eventType] ?? t.eventType}</Badge>
                    <span className="text-sm font-mono">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Agents */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Most Active Agents</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.topAgents?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agent data available.</p>
            ) : (
              <div className="space-y-2">
                {summary.data?.topAgents?.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-mono">{a.agentId || "unknown"}</span>
                    <Badge variant="outline">{a.count} event{a.count !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "events" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={eventType} onValueChange={v => { setEventType(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Event Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="unexpected_agent">Unexpected Agent</SelectItem>
                <SelectItem value="circular_delegation">Circular Delegation</SelectItem>
                <SelectItem value="deep_delegation">Deep Delegation</SelectItem>
                <SelectItem value="instruction_conflict">Instruction Conflict</SelectItem>
                <SelectItem value="orphaned_delegation">Orphaned Delegation</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={v => { setSeverity(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
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

          {/* Events Table */}
          {events.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (events.data?.events?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Network className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No multi-agent events found matching your filters.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Agents</th>
                    <th className="text-left px-4 py-3 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 font-medium">Message</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.data?.events?.map((evt) => (
                    <tr key={evt.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[evt.eventType] ?? evt.eventType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs font-mono">
                          {evt.fromAgent && <span>{evt.fromAgent}</span>}
                          {evt.fromAgent && evt.toAgent && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                          {evt.toAgent && <span>{evt.toAgent}</span>}
                          {!evt.fromAgent && !evt.toAgent && evt.agentId && <span>{evt.agentId}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[evt.severity]}`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[250px]">{evt.message}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs capitalize ${evt.status === "open" ? "text-amber-400" : "text-muted-foreground"}`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(evt.detectedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {evt.status === "open" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ eventId: evt.id, status: "acknowledged" })}
                              disabled={resolve.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" /> Ack
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ eventId: evt.id, status: "resolved" })}
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
          {(events.data?.total ?? 0) > limit && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, events.data?.total ?? 0)} of {events.data?.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * limit >= (events.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "network" && (
        <div className="space-y-6">
          {network.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !network.data?.snapshot?.agents?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Network className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-sm">No agent network data available yet.</p>
              <p className="text-xs mt-1">Agent interactions will appear here once multi-agent sessions are tracked.</p>
            </div>
          ) : (
            <>
              {/* Agent Nodes */}
              <div className="border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold mb-4">Agent Nodes ({network.data.snapshot!.agents.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {network.data.snapshot!.agents.map((agent) => (
                    <div key={agent.agentId} className="border border-border rounded-lg p-4 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono font-medium">{agent.agentId}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{agent.eventCount} events</span>
                        <span>{agent.delegationsSent} delegations out</span>
                        <span>{agent.delegationsReceived} delegations in</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edges / Delegation Flows */}
              {(network.data.snapshot!.edges?.length ?? 0) > 0 && (
                <div className="border border-border rounded-lg p-5">
                  <h3 className="text-sm font-semibold mb-4">Delegation Flows ({network.data.snapshot!.edges.length})</h3>
                  <div className="space-y-2">
                    {network.data.snapshot!.edges.map((edge, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2 text-sm font-mono">
                          <span>{edge.from}</span>
                          <ArrowRight className="w-4 h-4 text-primary" />
                          <span>{edge.to}</span>
                        </div>
                        <Badge variant="outline">{edge.count} {edge.type}{edge.count !== 1 ? "s" : ""}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
