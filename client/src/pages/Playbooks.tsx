/**
 * Playbooks Page — Two-column layout:
 *   Left: List of playbooks with status indicators
 *   Right: Detail view showing Problem → Root Cause → Fix Steps → Verification → Progress
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Target,
  Search,
  FileText,
  Wrench,
  BarChart3,
} from "lucide-react";

const priorityConfig = {
  p1: { label: "P1 — Critical", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  p2: { label: "P2 — Warning", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  p3: { label: "P3 — Info", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const statusConfig = {
  not_started: { label: "Not Started", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-amber-400" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-green-400" },
};

export default function Playbooks({ projectId }: { projectId: number }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: playbooks, isLoading } = trpc.recommendations.getPlaybooks.useQuery(
    { projectId },
    { refetchInterval: 30000 }
  );

  const { data: detail, isLoading: detailLoading } = trpc.recommendations.getPlaybookDetail.useQuery(
    { playbookId: selectedId! },
    { enabled: !!selectedId }
  );

  const generateMutation = trpc.recommendations.generate.useMutation({
    onSuccess: () => {
      utils.recommendations.getPlaybooks.invalidate({ projectId });
      utils.recommendations.getActive.invalidate({ projectId });
    },
  });

  const toggleStepMutation = trpc.recommendations.toggleStep.useMutation({
    onSuccess: () => {
      if (selectedId) {
        utils.recommendations.getPlaybookDetail.invalidate({ playbookId: selectedId });
      }
      utils.recommendations.getPlaybooks.invalidate({ projectId });
    },
  });

  const completedCount = detail?.steps?.filter((s: any) => s.completed).length ?? 0;
  const totalSteps = detail?.steps?.length ?? 0;
  const progress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Improvement Playbooks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step-by-step guides to fix detected issues in your AI system
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateMutation.mutate({ projectId, force: true })}
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
              Re-analyze
            </>
          )}
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* Left: Playbook List */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {playbooks?.length ?? 0} Playbook{(playbooks?.length ?? 0) !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !playbooks || playbooks.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground mb-3">
                  No playbooks yet. Run the AI analyzer to detect issues and generate fix guides.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateMutation.mutate({ projectId, force: true })}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Analyze My System
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {playbooks.map((pb: any) => {
                  const status = statusConfig[pb.status as keyof typeof statusConfig] || statusConfig.not_started;
                  const priority = priorityConfig[pb.priority as keyof typeof priorityConfig] || priorityConfig.p3;
                  const StatusIcon = status.icon;
                  const isSelected = selectedId === pb.id;

                  return (
                    <button
                      key={pb.id}
                      onClick={() => setSelectedId(pb.id)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent/50 ${
                        isSelected ? "bg-accent/70 border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${status.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                            {pb.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priority.color}`}>
                              {pb.priority.toUpperCase()}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{status.label}</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 mt-1 ${isSelected ? "text-primary" : "text-muted-foreground/50"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Playbook Detail */}
        <div className="space-y-4">
          {!selectedId ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">Select a playbook to view its details</p>
              </CardContent>
            </Card>
          ) : detailLoading ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : detail ? (
            <>
              {/* Title + Priority + Progress */}
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            priorityConfig[detail.priority as keyof typeof priorityConfig]?.color ?? ""
                          }`}
                        >
                          {detail.priority.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            statusConfig[detail.status as keyof typeof statusConfig]?.color ?? ""
                          }`}
                        >
                          {statusConfig[detail.status as keyof typeof statusConfig]?.label ?? detail.status}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">{detail.title}</h2>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {totalSteps > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{completedCount} of {totalSteps} steps completed</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Problem */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Search className="w-4 h-4" /> Problem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {detail.problem}
                  </p>
                </CardContent>
              </Card>

              {/* Root Cause */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" /> Root Cause
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {detail.rootCause}
                  </p>
                </CardContent>
              </Card>

              {/* Fix Steps (checkable) */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Fix Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.steps && detail.steps.length > 0 ? (
                    <div className="space-y-3">
                      {detail.steps.map((step: any, idx: number) => (
                        <div
                          key={step.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            step.completed
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-card border-border hover:border-primary/30"
                          }`}
                        >
                          <Checkbox
                            checked={step.completed}
                            onCheckedChange={(checked) => {
                              toggleStepMutation.mutate({
                                stepId: step.id,
                                completed: !!checked,
                              });
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                Step {idx + 1}
                              </span>
                              {step.completed && (
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                              )}
                            </div>
                            <p className={`text-sm leading-relaxed mt-0.5 ${
                              step.completed ? "text-muted-foreground line-through" : "text-foreground"
                            }`}>
                              {step.title}
                            </p>
                            {step.description && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No steps defined for this playbook.</p>
                  )}
                </CardContent>
              </Card>

              {/* Verification */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" /> How to Verify
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {detail.verification}
                  </p>
                </CardContent>
              </Card>

              {/* Baseline Metrics */}
              {detail.baselineMetrics && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Baseline Metrics (at detection time)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg Confidence</p>
                        <p className="text-lg font-semibold text-foreground">
                          {((detail.baselineMetrics as any).avgConfidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Hallucination Rate</p>
                        <p className="text-lg font-semibold text-foreground">
                          {((detail.baselineMetrics as any).hallucinationRate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg Latency</p>
                        <p className="text-lg font-semibold text-foreground">
                          {(detail.baselineMetrics as any).avgLatency}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trace Count</p>
                        <p className="text-lg font-semibold text-foreground">
                          {(detail.baselineMetrics as any).traceCount}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">Playbook not found.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
