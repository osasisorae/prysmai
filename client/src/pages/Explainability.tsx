import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Brain,
  Eye,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InsightsStrip } from "@/components/InsightsStrip";

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE TRENDS CHART (Canvas-based line chart)
// ═══════════════════════════════════════════════════════════════

function ConfidenceTrendsChart({ trends }: {
  trends: Array<{ date: string; avgConfidence: number; avgRisk: number; traceCount: number; hallucinationCount: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trends.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = 100 - i * 25;
      const y = pad.top + (chartH / 4) * i;
      ctx.fillText(`${val}%`, pad.left - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(trends.length / 6));
    for (let i = 0; i < trends.length; i += step) {
      const x = pad.left + (i / (trends.length - 1 || 1)) * chartW;
      const label = trends[i].date.slice(5); // MM-DD
      ctx.fillText(label, x, H - pad.bottom + 18);
    }

    // Draw confidence line (cyan)
    const drawLine = (data: number[], color: string, fillColor: string) => {
      if (data.length < 2) return;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + (i / (data.length - 1)) * chartW;
        const y = pad.top + (1 - data[i]) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fill area
      const lastIdx = data.length - 1;
      ctx.lineTo(pad.left + (lastIdx / (data.length - 1)) * chartW, pad.top + chartH);
      ctx.lineTo(pad.left, pad.top + chartH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Dots
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + (i / (data.length - 1)) * chartW;
        const y = pad.top + (1 - data[i]) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    };

    const confData = trends.map((t) => t.avgConfidence);
    const riskData = trends.map((t) => t.avgRisk);

    drawLine(confData, "oklch(0.75 0.15 195)", "rgba(0, 210, 190, 0.08)");
    drawLine(riskData, "oklch(0.65 0.22 25)", "rgba(239, 68, 68, 0.06)");

    // Legend
    const legendY = 10;
    ctx.font = "11px Inter, sans-serif";

    ctx.fillStyle = "oklch(0.75 0.15 195)";
    ctx.fillRect(W - pad.right - 200, legendY, 10, 10);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "left";
    ctx.fillText("Avg Confidence", W - pad.right - 186, legendY + 9);

    ctx.fillStyle = "oklch(0.65 0.22 25)";
    ctx.fillRect(W - pad.right - 90, legendY, 10, 10);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("Avg Risk", W - pad.right - 76, legendY + 9);
  }, [trends]);

  if (trends.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>No trend data available</p>
          <p className="text-xs mt-1">Send requests through the proxy to see confidence trends</p>
        </div>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="w-full h-64" />;
}

// ═══════════════════════════════════════════════════════════════
// METRIC CARDS
// ═══════════════════════════════════════════════════════════════

function MetricCard({ title, value, subtitle, icon: Icon, color }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  color?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{title}</p>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-mono font-semibold ${color ?? "text-foreground"}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// HALLUCINATION HISTORY TABLE
// ═══════════════════════════════════════════════════════════════

function HallucinationHistoryTable({ candidates, isLoading }: {
  candidates: Array<{
    traceId: string;
    model: string;
    provider: string;
    text: string;
    avgConfidence: number;
    timestamp: Date;
  }>;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayCount = expanded ? candidates.length : 10;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (candidates.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <Eye className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p className="text-green-400 font-medium">No hallucinations detected</p>
          <p className="text-xs mt-1">All analyzed traces show confident completions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 px-2 font-medium">Flagged Text</th>
              <th className="text-left py-2 px-2 font-medium">Confidence</th>
              <th className="text-left py-2 px-2 font-medium">Model</th>
              <th className="text-left py-2 px-2 font-medium">Provider</th>
              <th className="text-left py-2 px-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {candidates.slice(0, displayCount).map((c, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                <td className="py-2.5 px-2">
                  <span className="font-mono text-red-300 truncate block max-w-[300px]" title={c.text}>
                    "{c.text}"
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <span className={`font-mono font-medium ${
                    c.avgConfidence < 0.2 ? "text-red-400" :
                    c.avgConfidence < 0.4 ? "text-amber-400" :
                    "text-yellow-400"
                  }`}>
                    {(c.avgConfidence * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 px-2 text-muted-foreground font-mono">{c.model}</td>
                <td className="py-2.5 px-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {c.provider}
                  </Badge>
                </td>
                <td className="py-2.5 px-2 text-muted-foreground">
                  {new Date(c.timestamp).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {candidates.length > 10 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3 mr-1" /> Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3 mr-1" /> Show all {candidates.length} candidates</>
          )}
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DECISION POINTS TABLE
// ═══════════════════════════════════════════════════════════════

function DecisionPointsTable({ projectId, from, to }: {
  projectId: number;
  from: Date;
  to: Date;
}) {
  const { data, isLoading } = trpc.explainability.getDecisionPointsAggregate.useQuery(
    { projectId, from, to, limit: 50 },
    { refetchInterval: 60000 }
  );

  const [sortBy, setSortBy] = useState<"margin" | "time">("margin");
  const points = useMemo(() => {
    if (!data?.decisionPoints) return [];
    const sorted = [...data.decisionPoints];
    if (sortBy === "time") sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted;
  }, [data, sortBy]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (points.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>No decision points found</p>
          <p className="text-xs mt-1">Decision points appear when the model nearly chose a different token</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data?.totalCount ?? 0} total decision points across all traces
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => setSortBy(sortBy === "margin" ? "time" : "margin")}
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortBy === "margin" ? "Closest first" : "Most recent"}
        </Button>
      </div>
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 px-2 font-medium">Chosen</th>
              <th className="text-left py-2 px-2 font-medium">Conf.</th>
              <th className="text-left py-2 px-2 font-medium">Alternative</th>
              <th className="text-left py-2 px-2 font-medium">Alt Conf.</th>
              <th className="text-left py-2 px-2 font-medium">Margin</th>
              <th className="text-left py-2 px-2 font-medium">Model</th>
              <th className="text-left py-2 px-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(0, 30).map((dp, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                <td className="py-2 px-2">
                  <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {dp.chosen}
                  </span>
                </td>
                <td className="py-2 px-2 font-mono text-green-400">
                  {(dp.chosenConfidence * 100).toFixed(1)}%
                </td>
                <td className="py-2 px-2">
                  <span className="font-mono text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    {dp.alternative}
                  </span>
                </td>
                <td className="py-2 px-2 font-mono text-amber-400">
                  {(dp.alternativeConfidence * 100).toFixed(1)}%
                </td>
                <td className="py-2 px-2">
                  <span className={`font-mono font-medium ${
                    dp.margin < 0.1 ? "text-red-400" :
                    dp.margin < 0.2 ? "text-amber-400" :
                    "text-muted-foreground"
                  }`}>
                    {(dp.margin * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-muted-foreground font-mono text-[10px]">{dp.model}</td>
                <td className="py-2 px-2 text-muted-foreground">
                  {new Date(dp.timestamp).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODEL COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════

function ModelComparisonTable({ projectId, from, to }: {
  projectId: number;
  from: Date;
  to: Date;
}) {
  const { data, isLoading } = trpc.explainability.getModelBreakdown.useQuery(
    { projectId, from, to },
    { refetchInterval: 60000 }
  );

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const breakdown = data?.breakdown ?? [];

  if (breakdown.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p>No model data available</p>
          <p className="text-xs mt-1">Send requests through different models to compare</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left py-2 px-2 font-medium">Model</th>
            <th className="text-left py-2 px-2 font-medium">Provider</th>
            <th className="text-right py-2 px-2 font-medium">Traces</th>
            <th className="text-right py-2 px-2 font-medium">Avg Confidence</th>
            <th className="text-right py-2 px-2 font-medium">Avg Risk</th>
            <th className="text-right py-2 px-2 font-medium">Hallucinations</th>
            <th className="text-right py-2 px-2 font-medium">High Risk</th>
            <th className="text-right py-2 px-2 font-medium">Avg Decisions</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((m, i) => (
            <tr key={i} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
              <td className="py-2.5 px-2 font-mono font-medium text-foreground">{m.model}</td>
              <td className="py-2.5 px-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {m.provider}
                </Badge>
              </td>
              <td className="py-2.5 px-2 text-right font-mono">{m.traceCount}</td>
              <td className="py-2.5 px-2 text-right">
                <span className={`font-mono font-medium ${
                  m.avgConfidence >= 0.8 ? "text-green-400" :
                  m.avgConfidence >= 0.5 ? "text-yellow-400" :
                  "text-red-400"
                }`}>
                  {(m.avgConfidence * 100).toFixed(1)}%
                </span>
              </td>
              <td className="py-2.5 px-2 text-right">
                <span className={`font-mono font-medium ${
                  m.avgRisk <= 0.1 ? "text-green-400" :
                  m.avgRisk <= 0.3 ? "text-amber-400" :
                  "text-red-400"
                }`}>
                  {(m.avgRisk * 100).toFixed(1)}%
                </span>
              </td>
              <td className="py-2.5 px-2 text-right font-mono">
                <span className={m.hallucinationCount > 0 ? "text-amber-400" : "text-muted-foreground"}>
                  {m.hallucinationCount}
                </span>
              </td>
              <td className="py-2.5 px-2 text-right font-mono">
                <span className={m.highRiskCount > 0 ? "text-red-400" : "text-green-400"}>
                  {m.highRiskCount}
                </span>
              </td>
              <td className="py-2.5 px-2 text-right font-mono text-muted-foreground">
                {m.avgDecisionPoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Visual bar comparison */}
      <div className="mt-4 space-y-3 pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground font-medium">Confidence Comparison</p>
        {breakdown.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground w-32 truncate" title={m.model}>
              {m.model}
            </span>
            <div className="flex-1 h-5 bg-background rounded-sm overflow-hidden relative">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${m.avgConfidence * 100}%`,
                  background: m.avgConfidence >= 0.8
                    ? "oklch(0.75 0.15 195)"
                    : m.avgConfidence >= 0.5
                    ? "oklch(0.82 0.16 80)"
                    : "oklch(0.65 0.22 25)",
                }}
              />
              <span className="absolute right-2 top-0.5 text-[10px] font-mono text-foreground/70">
                {(m.avgConfidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPLAINABILITY PAGE
// ═══════════════════════════════════════════════════════════════

export default function ExplainabilityPage({ projectId }: { projectId: number }) {
  const [timeRange, setTimeRange] = useState("30d");

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (timeRange === "all") {
      return { from: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000), to: now };
    }
    const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : timeRange === "30d" ? 30 : 90;
    return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), to: now };
  }, [timeRange]);

  const report = trpc.explainability.getHallucinationReport.useQuery(
    { projectId, limit: 200, minRisk: 0, from, to },
    { refetchInterval: 30000 }
  );

  const trends = trpc.explainability.getConfidenceTrends.useQuery(
    { projectId, from, to },
    { refetchInterval: 60000 }
  );

  const summary = report.data?.summary;
  const candidates = report.data?.candidates ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Explainability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Confidence analysis, hallucination detection, and model decision insights
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-36 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="14d">Last 14 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI Insights Strip */}
      <InsightsStrip projectId={projectId} />

      {/* Summary Metric Cards */}
      {report.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary && summary.totalTraces > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Avg Confidence"
            value={`${(summary.avgConfidence * 100).toFixed(1)}%`}
            subtitle={`Across ${summary.totalTraces} analyzed traces`}
            icon={Brain}
            color={
              summary.avgConfidence >= 0.8 ? "text-green-400" :
              summary.avgConfidence >= 0.5 ? "text-yellow-400" :
              "text-red-400"
            }
          />
          <MetricCard
            title="High Risk Traces"
            value={`${summary.highRiskTraces}`}
            subtitle={`${((summary.highRiskTraces / summary.totalTraces) * 100).toFixed(1)}% of total`}
            icon={AlertTriangle}
            color={summary.highRiskTraces > 0 ? "text-red-400" : "text-green-400"}
          />
          <MetricCard
            title="Hallucination Candidates"
            value={`${summary.totalHallucinationCandidates}`}
            subtitle="Low-confidence segments flagged"
            icon={Eye}
            color={summary.totalHallucinationCandidates > 0 ? "text-amber-400" : "text-green-400"}
          />
          <MetricCard
            title="Analyzed Traces"
            value={`${summary.totalTraces}`}
            subtitle="With confidence data"
            icon={TrendingUp}
          />
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm text-muted-foreground">No explainability data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send requests through the proxy with explainability enabled to see insights
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confidence Trends Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Confidence Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trends.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ConfidenceTrendsChart trends={trends.data?.trends ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Two-column: Model Comparison + Decision Points */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Model Comparison */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Model Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ModelComparisonTable projectId={projectId} from={from} to={to} />
          </CardContent>
        </Card>

        {/* Decision Points */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GitBranch className="w-4 h-4" /> Decision Points Explorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DecisionPointsTable projectId={projectId} from={from} to={to} />
          </CardContent>
        </Card>
      </div>

      {/* Hallucination History */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Eye className="w-4 h-4" /> Hallucination History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HallucinationHistoryTable
            candidates={candidates}
            isLoading={report.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
