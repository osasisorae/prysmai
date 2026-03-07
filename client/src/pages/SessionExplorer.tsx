/**
 * Session Explorer — Browse, search, and inspect agent governance sessions.
 *
 * Shows a paginated table of sessions with status, behavior score, agent type,
 * and duration. Clicking a session opens a detail panel with event timeline,
 * behavioral assessments, and violations.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Brain,
  Shield,
  ArrowLeft,
  Zap,
  Code,
  FileText,
  MessageSquare,
  Terminal,
  GitBranch,
  Eye,
} from "lucide-react";

// ─── Helpers ───

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatTimestamp(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-primary";
    case "completed":
      return "text-green-400";
    case "failed":
      return "text-red-400";
    case "timeout":
      return "text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "active":
      return <Activity className="w-3.5 h-3.5" />;
    case "completed":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5" />;
    case "timeout":
      return <Timer className="w-3.5 h-3.5" />;
    default:
      return <Activity className="w-3.5 h-3.5" />;
  }
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function eventIcon(eventType: string) {
  switch (eventType) {
    case "llm_call":
      return <Brain className="w-3.5 h-3.5 text-primary" />;
    case "tool_call":
      return <Terminal className="w-3.5 h-3.5 text-violet-400" />;
    case "tool_result":
      return <Zap className="w-3.5 h-3.5 text-green-400" />;
    case "code_generated":
      return <Code className="w-3.5 h-3.5 text-amber-400" />;
    case "code_executed":
      return <Terminal className="w-3.5 h-3.5 text-amber-400" />;
    case "file_read":
    case "file_write":
      return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    case "decision":
      return <GitBranch className="w-3.5 h-3.5 text-primary" />;
    case "error":
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    case "delegation":
      return <MessageSquare className="w-3.5 h-3.5 text-violet-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

// ─── Session List ───

function SessionList({
  projectId,
  onSelect,
}: {
  projectId: number;
  onSelect: (sessionId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 15;

  const sessions = trpc.governance.listSessions.useQuery(
    {
      projectId,
      status: statusFilter === "all" ? undefined : (statusFilter as any),
      limit,
      offset: page * limit,
    },
    { placeholderData: (prev) => prev }
  );

  const totalPages = Math.ceil((sessions.data?.total ?? 0) / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Session Explorer
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and inspect agent governance sessions
          </p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36 h-9 text-sm bg-card border-border">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-card/50 border-b border-border text-muted-foreground">
              <th className="text-left py-2.5 px-4 font-medium">Session</th>
              <th className="text-left py-2.5 px-4 font-medium">Agent</th>
              <th className="text-left py-2.5 px-4 font-medium">Status</th>
              <th className="text-left py-2.5 px-4 font-medium">Score</th>
              <th className="text-left py-2.5 px-4 font-medium">Duration</th>
              <th className="text-left py-2.5 px-4 font-medium">Started</th>
              <th className="text-right py-2.5 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-10" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-14" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3 px-4"></td>
                </tr>
              ))}
            {sessions.data?.sessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-border/50 hover:bg-card/30 cursor-pointer transition-colors"
                onClick={() => onSelect(s.sessionId)}
              >
                <td className="py-3 px-4">
                  <span className="font-mono text-xs text-foreground">{s.sessionId.slice(0, 18)}...</span>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs font-normal">
                    {s.agentType}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <span className={`flex items-center gap-1.5 ${statusColor(s.status)}`}>
                    {statusIcon(s.status)}
                    <span className="capitalize text-xs">{s.status}</span>
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`font-mono text-xs font-medium ${scoreColor(s.behaviorScore)}`}>
                    {s.behaviorScore ?? "—"}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  {formatDuration(s.durationMs)}
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">
                  {formatTimestamp(s.startedAt)}
                </td>
                <td className="py-3 px-4 text-right">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                </td>
              </tr>
            ))}
            {sessions.data?.sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No sessions found</p>
                  <p className="text-xs mt-1">Sessions will appear here when agents connect via MCP</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page + 1} of {totalPages} ({sessions.data?.total} sessions)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Session Detail ───

function SessionDetail({
  projectId,
  sessionId,
  onBack,
}: {
  projectId: number;
  sessionId: string;
  onBack: () => void;
}) {
  const detail = trpc.governance.getSession.useQuery({ projectId, sessionId });
  const timeline = trpc.governance.getSessionTimeline.useQuery({ projectId, sessionId });

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  const { session, events, assessments, violations } = detail.data;

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Session Detail
          </h2>
          <p className="text-xs font-mono text-muted-foreground">{session.sessionId}</p>
        </div>
      </div>

      {/* Session overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <span className={`flex items-center gap-1.5 font-medium ${statusColor(session.status)}`}>
              {statusIcon(session.status)}
              <span className="capitalize">{session.status}</span>
            </span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Behavior Score</p>
            <span className={`text-xl font-bold font-mono ${scoreColor(session.behaviorScore)}`}>
              {session.behaviorScore ?? "—"}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <span className="text-sm font-medium">{formatDuration(session.durationMs)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Events</p>
            <span className="text-sm font-medium">{session.totalEvents ?? events.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Task instructions */}
      {session.taskInstructions && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Task Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{session.taskInstructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Two-column: Timeline + Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event Timeline */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Event Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
              {timeline.data?.timeline.map((e, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 py-1.5 border-b border-border/30 last:border-0"
                >
                  <div className="mt-0.5 shrink-0">{eventIcon(e.eventType)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{e.summary}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      #{e.sequenceNumber} · {formatTimestamp(e.eventTimestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {(!timeline.data?.timeline || timeline.data.timeline.length === 0) && (
                <p className="text-xs text-muted-foreground py-4 text-center">No events recorded</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assessments + Violations */}
        <div className="space-y-4">
          {/* Behavioral Assessments */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Behavioral Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No assessments yet</p>
              ) : (
                <div className="space-y-3">
                  {assessments.map((a) => (
                    <div key={a.id} className="p-3 rounded-md bg-background/50 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">{a.assessmentType}</Badge>
                        <span className={`font-mono text-sm font-bold ${scoreColor(a.overallScore)}`}>
                          {a.overallScore}
                        </span>
                      </div>
                      {a.recommendations && (a.recommendations as string[]).length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                          {(a.recommendations as string[]).slice(0, 3).map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Violations */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                Violations ({violations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No violations detected</p>
              ) : (
                <div className="space-y-2">
                  {violations.map((v) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-md border ${
                        v.severity === "critical"
                          ? "border-red-500/30 bg-red-500/5"
                          : v.severity === "high"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-background/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 ${
                            v.severity === "critical" ? "text-red-400" : "text-amber-400"
                          }`}
                        />
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            v.severity === "critical" ? "text-red-400 border-red-500/30" : "text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {v.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{v.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function SessionExplorer({ projectId }: { projectId: number }) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  if (selectedSession) {
    return (
      <SessionDetail
        projectId={projectId}
        sessionId={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return <SessionList projectId={projectId} onSelect={setSelectedSession} />;
}
