/**
 * Agent Decision Explainability — Phase 2
 *
 * Answers "Why did the agent choose that tool?" and "Why did it take that action?"
 *
 * For a given session, shows:
 *   - Timeline of decisions with context (preceding/following events)
 *   - The triggering LLM call for each decision
 *   - Decision flow visualization
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Wrench,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Zap,
  AlertTriangle,
  Clock,
  Search,
  Lightbulb,
  Eye,
} from "lucide-react";

interface AgentDecisionsProps {
  projectId: number;
}

// ─── Helpers ───

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function eventTypeIcon(type: string) {
  switch (type) {
    case "llm_call":
      return <Brain className="w-3.5 h-3.5 text-violet-400" />;
    case "tool_call":
    case "tool_result":
      return <Wrench className="w-3.5 h-3.5 text-primary" />;
    case "decision":
      return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
    case "delegation":
      return <GitBranch className="w-3.5 h-3.5 text-blue-400" />;
    case "error":
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    default:
      return <Zap className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function eventTypeBadge(type: string) {
  const colors: Record<string, string> = {
    llm_call: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    tool_call: "bg-primary/10 text-primary border-primary/20",
    tool_result: "bg-green-500/10 text-green-400 border-green-500/20",
    decision: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    delegation: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return colors[type] || "bg-muted text-muted-foreground border-border";
}

export default function AgentDecisions({ projectId }: AgentDecisionsProps) {
  const [sessionId, setSessionId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expandedDecision, setExpandedDecision] = useState<number | null>(null);
  const [contextWindow, setContextWindow] = useState(5);

  // ─── Queries ───

  // List recent sessions to pick from
  const sessionsQuery = trpc.governance.listSessions.useQuery(
    { projectId, limit: 20 },
    { staleTime: 30_000 }
  );

  const decisionsQuery = trpc.unifiedTrace.getDecisions.useQuery(
    { projectId, sessionId, contextWindow },
    { enabled: !!sessionId, staleTime: 30_000 }
  );

  const decisions = decisionsQuery.data ?? [];
  const sessions = sessionsQuery.data?.sessions ?? [];

  // Filter decisions by search
  const filteredDecisions = useMemo(() => {
    if (!searchInput) return decisions;
    const q = searchInput.toLowerCase();
    return decisions.filter(
      (d) =>
        d.description.toLowerCase().includes(q) ||
        d.precedingEvents.some((e) => e.summary.toLowerCase().includes(q)) ||
        d.followingEvents.some((e) => e.summary.toLowerCase().includes(q))
    );
  }, [decisions, searchInput]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Agent Decision Explainability
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Understand why your agent chose specific tools and actions. Select a session to analyze.
        </p>
      </div>

      {/* Session Selector */}
      <Card className="bg-card/50 border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Select Session</label>
              <div className="flex gap-2 flex-wrap">
                {sessions.length === 0 && !sessionsQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">No sessions found. Run an agent session first.</p>
                )}
                {sessionsQuery.isLoading && <Skeleton className="h-8 w-48" />}
                {sessions.slice(0, 8).map((s) => (
                  <Button
                    key={s.sessionId}
                    variant={sessionId === s.sessionId ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSessionId(s.sessionId)}
                  >
                    <span className="truncate max-w-[120px]">{s.agentType}</span>
                    <Badge variant="outline" className="ml-1.5 text-[10px]">
                      {s.status}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No session selected */}
      {!sessionId && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Eye className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a session above to analyze decisions</p>
          <p className="text-sm mt-1">Each decision will show what triggered it and what followed</p>
        </div>
      )}

      {/* Decisions List */}
      {sessionId && (
        <>
          {/* Search + Stats */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search decisions..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{filteredDecisions.length} decisions</span>
              <span>·</span>
              <span>Context: ±{contextWindow} events</span>
            </div>
          </div>

          {decisionsQuery.isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          )}

          {!decisionsQuery.isLoading && filteredDecisions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Brain className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No decision events found in this session</p>
              <p className="text-xs mt-1">
                Decision events are recorded when the agent selects tools, delegates, or makes explicit choices
              </p>
            </div>
          )}

          {/* Decision Cards */}
          <div className="space-y-4">
            {filteredDecisions.map((d, idx) => {
              const isExpanded = expandedDecision === d.decisionId;
              return (
                <Card
                  key={d.decisionId}
                  className={`bg-card/50 border-border transition-all ${
                    isExpanded ? "ring-1 ring-primary/30" : ""
                  }`}
                >
                  <CardContent className="pt-4 pb-4">
                    {/* Decision Header */}
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedDecision(isExpanded ? null : d.decisionId)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{d.description}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(d.timestamp)}
                              </span>
                              <span>Step #{d.sequenceNumber}</span>
                              {d.triggeringLlmCall && (
                                <span className="flex items-center gap-1">
                                  <Brain className="w-3 h-3 text-violet-400" />
                                  Triggered by {d.triggeringLlmCall.model || "LLM"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Preceding Context */}
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <ArrowLeft className="w-3 h-3" />
                              Context (before)
                            </h4>
                            <div className="space-y-1.5">
                              {d.precedingEvents.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Session start</p>
                              )}
                              {d.precedingEvents.map((e, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 py-1 px-2 rounded bg-background/50 text-xs"
                                >
                                  {eventTypeIcon(e.eventType)}
                                  <span className="truncate">{e.summary}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* The Decision */}
                          <div className="flex flex-col items-center">
                            <h4 className="text-xs font-medium text-amber-400 mb-2">Decision</h4>
                            <div className="w-full p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                              <p className="text-sm text-center font-medium">{d.description}</p>
                              {d.triggeringLlmCall && (
                                <div className="mt-2 pt-2 border-t border-amber-500/10 text-xs text-muted-foreground text-center">
                                  <p>
                                    Triggered by{" "}
                                    <span className="text-violet-400">{d.triggeringLlmCall.model}</span>
                                  </p>
                                  {d.triggeringLlmCall.promptTokens != null && (
                                    <p className="mt-0.5">
                                      {d.triggeringLlmCall.promptTokens}→{d.triggeringLlmCall.completionTokens} tokens
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Following Consequence */}
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              Consequence (after)
                              <ArrowRight className="w-3 h-3" />
                            </h4>
                            <div className="space-y-1.5">
                              {d.followingEvents.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Session end</p>
                              )}
                              {d.followingEvents.map((e, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 py-1 px-2 rounded bg-background/50 text-xs"
                                >
                                  {eventTypeIcon(e.eventType)}
                                  <span className="truncate">{e.summary}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
