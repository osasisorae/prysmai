import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, X } from "lucide-react";
import TokenConfidenceHeatmap from "./TokenConfidenceHeatmap";

interface Props {
  traceIds: number[];
  onClose: () => void;
}

interface ComparisonItem {
  traceId: number;
  model: string;
  provider: string;
  completion: string | null;
  confidenceAnalysis: any;
  logprobs: any;
}

export default function ModelComparisonView({ traceIds, onClose }: Props) {
  const { data, isLoading, error } = trpc.explainability.compareModels.useQuery(
    { traceIds },
    { enabled: traceIds.length >= 2 }
  );

  const comparisons = (data?.comparisons ?? []) as ComparisonItem[];

  // Build comparison table data
  const tableData = useMemo(() => {
    if (!comparisons.length) return [];
    return comparisons.map((c) => {
      const analysis = c.confidenceAnalysis;
      return {
        model: c.model,
        provider: c.provider,
        overallConfidence: analysis?.overall_confidence ?? 0,
        hallucinationRisk: analysis?.hallucination_risk_score ?? 0,
        decisionPoints: analysis?.decision_points?.length ?? 0,
        lowConfidenceSegments: analysis?.hallucination_candidates?.length ?? 0,
        totalTokens: analysis?.total_tokens ?? 0,
        highConfidenceTokens: analysis?.high_confidence_tokens ?? 0,
        lowConfidenceTokens: analysis?.low_confidence_tokens ?? 0,
        logprobsSource: analysis?.logprobs_source ?? "unknown",
      };
    });
  }, [comparisons]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 bg-red-500/10 rounded-md p-3">
        Failed to load comparison: {error.message}
      </div>
    );
  }

  if (comparisons.length < 2) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        Select at least 2 traces to compare models.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Model Comparison</span>
          <Badge variant="outline" className="text-[10px]">
            {comparisons.length} models
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7">
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">
                Metric
              </th>
              {tableData.map((t, i) => (
                <th
                  key={i}
                  className="text-center py-2 px-3 text-xs font-medium"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{t.model}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {t.provider}
                    </Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Overall Confidence",
                key: "overallConfidence" as const,
                format: (v: number) => `${(v * 100).toFixed(1)}%`,
                best: "high" as const,
              },
              {
                label: "Hallucination Risk",
                key: "hallucinationRisk" as const,
                format: (v: number) => `${(v * 100).toFixed(1)}%`,
                best: "low" as const,
              },
              {
                label: "Decision Points",
                key: "decisionPoints" as const,
                format: (v: number) => v.toString(),
                best: "low" as const,
              },
              {
                label: "Low Confidence Segments",
                key: "lowConfidenceSegments" as const,
                format: (v: number) => v.toString(),
                best: "low" as const,
              },
              {
                label: "Total Tokens",
                key: "totalTokens" as const,
                format: (v: number) => v.toString(),
                best: "neutral" as const,
              },
              {
                label: "High Confidence Tokens",
                key: "highConfidenceTokens" as const,
                format: (v: number) => v.toString(),
                best: "high" as const,
              },
              {
                label: "Logprobs Source",
                key: "logprobsSource" as const,
                format: (v: string) => v,
                best: "neutral" as const,
              },
            ].map((metric) => {
              // Find best value for highlighting
              const values = tableData.map((t) => (t as any)[metric.key]);
              const numValues = values.filter(
                (v): v is number => typeof v === "number"
              );
              const bestVal =
                metric.best === "high"
                  ? Math.max(...numValues)
                  : metric.best === "low"
                  ? Math.min(...numValues)
                  : null;

              return (
                <tr key={metric.label} className="border-b border-border/50">
                  <td className="py-2 px-3 text-xs text-muted-foreground">
                    {metric.label}
                  </td>
                  {tableData.map((t, i) => {
                    const val = (t as any)[metric.key];
                    const isBest =
                      bestVal !== null &&
                      typeof val === "number" &&
                      val === bestVal &&
                      numValues.length > 1;
                    return (
                      <td
                        key={i}
                        className={`py-2 px-3 text-center font-mono text-xs ${
                          isBest ? "text-primary font-medium" : ""
                        }`}
                      >
                        {(metric.format as (v: any) => string)(val)}
                        {isBest && (
                          <span className="text-[9px] text-primary ml-1">
                            ★
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Side-by-side heatmaps */}
      <div className={`grid gap-4 ${comparisons.length === 2 ? "grid-cols-2" : comparisons.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {comparisons.map((c, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {c.model}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {c.provider}
              </span>
            </div>
            {c.logprobs?.content ? (
              <div className="max-h-48 overflow-y-auto">
                <TokenConfidenceHeatmap
                  logprobs={c.logprobs}
                  perToken={c.confidenceAnalysis?.per_token}
                  hallucinationCandidates={
                    c.confidenceAnalysis?.hallucination_candidates
                  }
                />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic py-4 text-center border border-border/50 rounded">
                {c.confidenceAnalysis?.logprobs_source === "estimated"
                  ? "Estimated confidence (no token-level data)"
                  : "No logprobs available"}
              </div>
            )}
            {/* Completion preview */}
            <div className="bg-background rounded border border-border p-2 max-h-24 overflow-y-auto">
              <p className="text-[11px] text-foreground/80 whitespace-pre-wrap">
                {c.completion?.slice(0, 300) ?? "(no completion)"}
                {(c.completion?.length ?? 0) > 300 && "..."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
