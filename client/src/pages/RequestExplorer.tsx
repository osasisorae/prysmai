import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import TokenConfidenceHeatmap from "@/components/TokenConfidenceHeatmap";
import HallucinationDetectorPanel from "@/components/HallucinationDetectorPanel";
import WhyDidItSayThat from "@/components/WhyDidItSayThat";
import DecisionPointsTimeline from "@/components/DecisionPointsTimeline";
import ModelComparisonView from "@/components/ModelComparisonView";
import { BarChart3 } from "lucide-react";

function TraceDetail({ traceId, projectId, onClose }: { traceId: string; projectId: number; onClose: () => void }) {
  const { data: trace, isLoading } = trpc.trace.get.useQuery({ traceId, projectId });
  const [copied, setCopied] = useState<string | null>(null);
  const [highlightedTokenIdx, setHighlightedTokenIdx] = useState<number | null>(null);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!trace) {
    return <div className="p-4 text-muted-foreground">Trace not found.</div>;
  }

  const promptMessages = trace.promptMessages ?? [];
  const completionContent = trace.completion ?? trace.errorMessage ?? "—";

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Model", value: trace.model },
          { label: "Status", value: trace.status },
          { label: "Latency", value: `${trace.latencyMs ?? "—"}ms` },
          { label: "Tokens", value: `${trace.promptTokens ?? 0} → ${trace.completionTokens ?? 0} (${trace.totalTokens ?? 0})` },
        ].map((item) => (
          <div key={item.label} className="space-y-1">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-sm font-mono">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Cost", value: `$${parseFloat(trace.costUsd ?? "0").toFixed(6)}` },
          { label: "Trace ID", value: trace.traceId },
          { label: "Time", value: new Date(trace.timestamp).toLocaleString() },
          { label: "Provider", value: trace.provider ?? "—" },
        ].map((item) => (
          <div key={item.label} className="space-y-1">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <div className="flex items-center gap-1">
              <p className="text-sm font-mono truncate">{item.value}</p>
              {item.label === "Trace ID" && (
                <button onClick={() => copyText(item.value, "traceId")} className="text-muted-foreground hover:text-foreground">
                  {copied === "traceId" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Prompt</p>
          <button
            onClick={() => copyText(JSON.stringify(promptMessages, null, 2), "prompt")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {copied === "prompt" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
          </button>
        </div>
        <div className="bg-background rounded-lg border border-border p-3 max-h-60 overflow-y-auto">
          {promptMessages.length > 0 ? (
            <div className="space-y-2">
              {promptMessages.map((msg: any, i: number) => (
                <div key={i}>
                  <span className="text-xs font-medium text-primary">{msg.role}:</span>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No messages found</p>
          )}
        </div>
      </div>

      {/* Completion */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Completion</p>
          <button
            onClick={() => copyText(completionContent, "completion")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {copied === "completion" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
          </button>
        </div>
        <div className="bg-background rounded-lg border border-border p-3 max-h-60 overflow-y-auto">
          <p className="text-sm text-foreground whitespace-pre-wrap">{completionContent}</p>
        </div>
      </div>

      {/* Tool Calls */}
      {trace.toolCalls && trace.toolCalls.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tool Calls</p>
            <button
              onClick={() => copyText(JSON.stringify(trace.toolCalls, null, 2), "toolCalls")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copied === "toolCalls" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
            </button>
          </div>
          <div className="bg-background rounded-lg border border-border p-3 max-h-60 overflow-y-auto">
            <div className="space-y-3">
              {trace.toolCalls.map((tc: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">{tc.function?.name ?? 'unknown'}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{tc.id}</span>
                  </div>
                  <pre className="text-xs text-foreground bg-card p-2 rounded overflow-x-auto">{(() => {
                    try { return JSON.stringify(JSON.parse(tc.function?.arguments ?? '{}'), null, 2); }
                    catch { return tc.function?.arguments ?? ''; }
                  })()}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Layer 3a: Explainability ═══ */}

      {/* Token Confidence Heatmap */}
      {trace.logprobs?.content && Array.isArray(trace.logprobs.content) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Token Confidence Heatmap</p>
          <TokenConfidenceHeatmap
            logprobs={trace.logprobs as { content: Array<{ token: string; logprob: number; top_logprobs?: Array<{ token: string; logprob: number }> }> }}
            perToken={(trace as any).confidenceAnalysis?.per_token}
            hallucinationCandidates={(trace as any).confidenceAnalysis?.hallucination_candidates}
            highlightedTokenIdx={highlightedTokenIdx}
            onTokenClick={(idx) => setHighlightedTokenIdx(idx)}
          />
        </div>
      )}

      {/* Hallucination Detector */}
      {(trace as any).confidenceAnalysis && (
        <HallucinationDetectorPanel
          candidates={(trace as any).confidenceAnalysis?.hallucination_candidates ?? []}
          tokens={trace.logprobs?.content as any}
          overallConfidence={(trace as any).confidenceAnalysis?.overall_confidence ?? 0}
          hallucinationRiskScore={(trace as any).confidenceAnalysis?.hallucination_risk_score ?? 0}
          onCandidateClick={(startIdx) => setHighlightedTokenIdx(startIdx)}
        />
      )}

      {/* Decision Points Timeline */}
      {(trace as any).confidenceAnalysis?.decision_points?.length > 0 && (
        <DecisionPointsTimeline
          decisionPoints={(trace as any).confidenceAnalysis.decision_points}
          totalTokens={(trace as any).confidenceAnalysis?.total_tokens ?? (trace.logprobs?.content as any[])?.length ?? 0}
          onPointClick={(tokenIdx) => setHighlightedTokenIdx(tokenIdx)}
        />
      )}

      {/* "Why did it say that?" button */}
      {trace.status === "success" && trace.completion && (
        <WhyDidItSayThat
          traceDbId={trace.id}
          provider={trace.provider ?? "openai"}
          onHighlightToken={setHighlightedTokenIdx}
        />
      )}

      {/* Confidence Summary (for Anthropic estimated) */}
      {(trace as any).confidenceAnalysis && !(trace.logprobs?.content) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Estimated Confidence Analysis</p>
          <div className="bg-card/50 rounded-lg border border-border p-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Overall Confidence</span>
                <p className="font-mono text-sm">{((trace as any).confidenceAnalysis.overall_confidence * 100).toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hallucination Risk</span>
                <p className="font-mono text-sm">{((trace as any).confidenceAnalysis.hallucination_risk_score * 100).toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Source</span>
                <p className="font-mono text-sm">{(trace as any).confidenceAnalysis.logprobs_source}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Provider</span>
                <p className="font-mono text-sm">{(trace as any).confidenceAnalysis.provider}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw Logprobs (collapsible) */}
      {trace.logprobs && (
        <details className="group">
          <summary className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">
            Raw Log Probabilities
          </summary>
          <div className="mt-2 bg-background rounded-lg border border-border p-3 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={() => copyText(JSON.stringify(trace.logprobs, null, 2), "logprobs")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied === "logprobs" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
              </button>
            </div>
            <pre className="text-xs text-foreground overflow-x-auto">{JSON.stringify(trace.logprobs, null, 2).slice(0, 5000)}</pre>
          </div>
        </details>
      )}
    </div>
  );
}

export default function RequestExplorer({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const limit = 25;

  const models = trpc.trace.models.useQuery({ projectId });

  const traces = trpc.trace.list.useQuery({
    projectId,
    limit,
    offset: page * limit,
    status: statusFilter !== "all" ? statusFilter : undefined,
    model: modelFilter !== "all" ? modelFilter : undefined,
  }, { refetchInterval: 10000 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Request Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">Inspect every request that flows through your proxy</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {models.data?.map((m: string) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || modelFilter !== "all") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStatusFilter("all"); setModelFilter("all"); setPage(0); }}
            className="h-9"
          >
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedForCompare([]);
            }}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {compareMode ? "Cancel Compare" : "Compare Models"}
          </Button>
          {compareMode && selectedForCompare.length >= 2 && (
            <Button
              size="sm"
              className="h-9"
              onClick={() => setShowComparison(true)}
            >
              Compare ({selectedForCompare.length})
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {traces.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : traces.data?.traces && traces.data.traces.length > 0 ? (
            <>
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_120px_80px_80px_80px_80px] gap-2 py-2.5 px-4 text-xs text-muted-foreground border-b border-border font-medium">
                <span className="w-2" />
                <span>Trace ID</span>
                <span>Model</span>
                <span className="text-right">Latency</span>
                <span className="text-right">Tokens</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Status</span>
              </div>
              {/* Rows */}
              {traces.data.traces.map((trace: any) => (
                <div
                  key={trace.id}
                  className="grid grid-cols-[auto_1fr_120px_80px_80px_80px_80px] gap-2 py-2.5 px-4 text-sm border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors w-full text-left cursor-pointer"
                  onClick={() => {
                    if (compareMode) {
                      setSelectedForCompare(prev =>
                        prev.includes(trace.id)
                          ? prev.filter(id => id !== trace.id)
                          : prev.length < 4 ? [...prev, trace.id] : prev
                      );
                    } else {
                      setSelectedTraceId(trace.traceId);
                    }
                  }}
                >
                  {compareMode ? (
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(trace.id)}
                      readOnly
                      className="mt-1 accent-primary"
                    />
                  ) : (
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      trace.status === "success" ? "bg-green-400" : "bg-red-400"
                    }`} />
                  )}
                  <span className="font-mono text-xs truncate">{trace.traceId}</span>
                  <span className="font-mono text-xs truncate">{trace.model}</span>
                  <span className="text-xs text-right text-muted-foreground">{trace.latencyMs ?? "\u2014"}ms</span>
                  <span className="text-xs text-right text-muted-foreground">{trace.totalTokens ?? 0}</span>
                  <span className="text-xs text-right text-muted-foreground">${parseFloat(trace.costUsd ?? "0").toFixed(4)}</span>
                  <span className={`text-xs text-right ${trace.status === "success" ? "text-green-400" : "text-red-400"}`}>
                    {trace.status}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No requests found</p>
              <p className="text-xs mt-1">
                {statusFilter !== "all" || modelFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Send requests through the proxy to see them here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {traces.data?.traces && traces.data.traces.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {page * limit + 1}–{page * limit + traces.data.traces.length} of {traces.data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={traces.data.traces.length < limit}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Trace Detail Dialog */}
      <Dialog open={!!selectedTraceId} onOpenChange={(open) => !open && setSelectedTraceId(null)}>
        <DialogContent className="max-w-3xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">Request Detail</DialogTitle>
          </DialogHeader>
          {selectedTraceId && (
            <TraceDetail
              traceId={selectedTraceId}
              projectId={projectId}
              onClose={() => setSelectedTraceId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Model Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={(open) => {
        if (!open) {
          setShowComparison(false);
          setSelectedForCompare([]);
          setCompareMode(false);
        }
      }}>
        <DialogContent className="max-w-5xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm">Model Comparison</DialogTitle>
          </DialogHeader>
          {showComparison && selectedForCompare.length >= 2 && (
            <ModelComparisonView
              traceIds={selectedForCompare}
              onClose={() => {
                setShowComparison(false);
                setSelectedForCompare([]);
                setCompareMode(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
