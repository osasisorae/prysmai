/**
 * InsightsStrip — Shows the top 3 actionable issues detected by the
 * Recommendations Engine. Each card has severity, headline, and a link
 * to the corresponding playbook.
 *
 * Used on: Dashboard Overview + Explainability page (top)
 */

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface InsightsStripProps {
  projectId: number | undefined;
  /** If true, show a compact version (no description, just headlines) */
  compact?: boolean;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-400",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-400",
    label: "Warning",
  },
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-400",
    label: "Info",
  },
};

export function InsightsStrip({ projectId, compact = false }: InsightsStripProps) {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const { data: recs, isLoading, refetch } = trpc.recommendations.getActive.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const generateMutation = trpc.recommendations.generate.useMutation({
    onSuccess: () => refetch(),
  });

  const dismissMutation = trpc.recommendations.dismiss.useMutation({
    onSuccess: () => refetch(),
  });

  // Filter out dismissed ones from local state
  const activeRecs = (recs || []).filter((r) => !dismissed.has(r.id));
  const topIssues = activeRecs.slice(0, 3);

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">AI Insights</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-border bg-card/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // No recommendations yet — show generate button
  if (topIssues.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">AI Insights</span>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {recs && recs.length === 0
              ? "No issues detected. Your system looks healthy."
              : "Generate AI-powered insights to find issues and get specific fix recommendations."}
          </p>
          {(!recs || recs.length === 0) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => projectId && generateMutation.mutate({ projectId, force: true })}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Analyze My System
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            AI Insights — {activeRecs.length} issue{activeRecs.length !== 1 ? "s" : ""} detected
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => projectId && generateMutation.mutate({ projectId, force: true })}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      <div className={`grid grid-cols-1 ${compact ? "" : "md:grid-cols-3"} gap-3`}>
        {topIssues.map((rec) => {
          const config = severityConfig[rec.severity as keyof typeof severityConfig] || severityConfig.info;
          const Icon = config.icon;

          return (
            <div
              key={rec.id}
              className={`relative rounded-lg border ${config.border} ${config.bg} p-4 group cursor-pointer transition-all hover:border-primary/40`}
              onClick={() => navigate("/dashboard/playbooks")}
            >
              {/* Dismiss button */}
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissed((prev) => new Set(prev).add(rec.id));
                  dismissMutation.mutate({ recommendationId: rec.id });
                }}
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>

              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded ${config.badge}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.text}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                    {rec.headline}
                  </p>
                  {!compact && rec.problem && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {rec.problem}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View Playbook <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
