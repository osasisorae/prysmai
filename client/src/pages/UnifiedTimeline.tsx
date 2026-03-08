/**
 * Unified Timeline — Phase 2
 *
 * Correlated view merging LLM traces, tool events, and session events
 * into a single chronologically-ordered stream. Allows filtering by
 * event type, session, and time range.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Wrench,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Code,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface UnifiedTimelineProps {
  projectId: number;
}

// ─── Helpers ───

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function eventIcon(eventType: string) {
  switch (eventType) {
    case "llm_call": return <Brain className="w-4 h-4 text-violet-400" />;
    case "tool_call": return <Wrench className="w-4 h-4 text-primary" />;
    case "tool_result": return <Wrench className="w-4 h-4 text-green-400" />;
    case "decision": return <Lightbulb className="w-4 h-4 text-amber-400" />;
    case "delegation": return <GitBranch className="w-4 h-4 text-blue-400" />;
    case "code_generated": return <Code className="w-4 h-4 text-emerald-400" />;
    case "code_executed": return <Code className="w-4 h-4 text-teal-400" />;
    case "file_read":
    case "file_write": return <FileText className="w-4 h-4 text-muted-foreground" />;
    case "error": return <AlertTriangle className="w-4 h-4 text-red-400" />;
    default: return <Zap className="w-4 h-4 text-muted-foreground" />;
  }
}

function sourceBadge(source: "trace" | "session_event") {
  if (source === "trace") {
    return <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">LLM Trace</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Session Event</Badge>;
}

const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "llm_call", label: "LLM Calls" },
  { value: "tool_call", label: "Tool Calls" },
  { value: "decision", label: "Decisions" },
  { value: "delegation", label: "Delegations" },
  { value: "error", label: "Errors" },
];

const TIME_RANGES = [
  { label: "Last 1h", value: "1h", ms: 60 * 60 * 1000 },
  { label: "Last 24h", value: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "Last 7d", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "All time", value: "all", ms: 0 },
];

const PAGE_SIZE = 50;

export default function UnifiedTimeline({ projectId }: UnifiedTimelineProps) {
  const [timeRange, setTimeRange] = useState("24h");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const range = TIME_RANGES.find((r) => r.value === timeRange) ?? TIME_RANGES[1];
  const from = range.ms > 0 ? Date.now() - range.ms : undefined;

  const eventTypes = eventTypeFilter === "all" ? undefined : [eventTypeFilter];

  const timelineQuery = trpc.unifiedTrace.getTimeline.useQuery(
    {
      projectId,
      from,
      eventTypes,
      sessionId: sessionFilter || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 15_000 }
  );

  const events = timelineQuery.data?.events ?? [];
  const total = timelineQuery.data?.total ?? 0;

  // Client-side search filter
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.eventType.toLowerCase().includes(q) ||
        (e.model && e.model.toLowerCase().includes(q)) ||
        (e.toolName && e.toolName.toLowerCase().includes(q)) ||
        (e.completion && e.completion.toLowerCase().includes(q)) ||
        (e.agentType && e.agentType.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Unified Timeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Correlated stream of LLM traces, tool events, and session events in chronological order
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={timeRange} onValueChange={(v) => { setTimeRange(v); setPage(0); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="ml-auto text-xs text-muted-foreground">
          {total} events
        </div>
      </div>

      {/* Timeline */}
      {timelineQuery.isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      )}

      {!timelineQuery.isLoading && filteredEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Layers className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No events found</p>
          <p className="text-sm mt-1">Try adjusting your filters or time range</p>
        </div>
      )}

      <div className="space-y-2">
        {filteredEvents.map((event) => {
          const isExpanded = expandedEvent === event.id;

          return (
            <Card
              key={event.id}
              className={`bg-card/50 border-border transition-all cursor-pointer ${
                isExpanded ? "ring-1 ring-primary/30" : "hover:bg-accent/20"
              }`}
              onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="shrink-0">{eventIcon(event.eventType)}</div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {event.eventType === "llm_call"
                          ? `LLM: ${event.model || "unknown"}`
                          : event.eventType === "tool_call" || event.eventType === "tool_result"
                          ? `Tool: ${event.toolName || "unknown"}`
                          : event.eventType.replace(/_/g, " ")}
                      </span>
                      {sourceBadge(event.source)}
                      {event.agentType && (
                        <Badge variant="outline" className="text-[10px]">
                          {event.agentType}
                        </Badge>
                      )}
                      {event.toolSuccess === false && (
                        <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                          Failed
                        </Badge>
                      )}
                    </div>
                    {event.completion && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">
                        {event.completion}
                      </p>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    {event.latencyMs != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(event.latencyMs)}
                      </span>
                    )}
                    {event.totalTokens != null && (
                      <span className="tabular-nums">{event.totalTokens} tok</span>
                    )}
                    <span>{formatTimestamp(event.timestamp)}</span>
                  </div>

                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {event.source === "trace" && (
                      <>
                        <div>
                          <span className="text-muted-foreground block">Provider</span>
                          <span>{event.provider || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Model</span>
                          <span>{event.model || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Tokens</span>
                          <span className="tabular-nums">
                            {event.promptTokens ?? 0} → {event.completionTokens ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Cost</span>
                          <span>{event.costUsd ? `$${event.costUsd}` : "—"}</span>
                        </div>
                      </>
                    )}
                    {event.source === "session_event" && (
                      <>
                        <div>
                          <span className="text-muted-foreground block">Tool</span>
                          <span>{event.toolName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Duration</span>
                          <span>{formatDuration(event.toolDurationMs)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Success</span>
                          <span>{event.toolSuccess == null ? "—" : event.toolSuccess ? "Yes" : "No"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Sequence</span>
                          <span>#{event.sequenceNumber ?? "—"}</span>
                        </div>
                      </>
                    )}
                    {event.sessionId && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Session</span>
                        <span className="font-mono text-[11px]">{event.sessionId}</span>
                      </div>
                    )}
                    {event.behavioralFlags && event.behavioralFlags.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block mb-1">Behavioral Flags</span>
                        <div className="flex gap-1 flex-wrap">
                          {event.behavioralFlags.map((f, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={`text-[10px] ${
                                f.severity >= 0.7
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : f.severity >= 0.4
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-muted"
                              }`}
                            >
                              {f.flag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
