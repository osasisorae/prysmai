import { useState, useCallback, useRef, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// ─── Types ───

interface TokenLogprob {
  token: string;
  logprob: number;
  top_logprobs?: Array<{ token: string; logprob: number }>;
}

interface TokenMetrics {
  token: string;
  confidence: number;
  entropy: number;
  margin: number;
  is_hallucination_risk: boolean;
}

interface HallucinationCandidate {
  text: string;
  start_token_idx: number;
  end_token_idx: number;
  avg_confidence: number;
  avg_entropy: number;
}

interface Props {
  logprobs: { content: TokenLogprob[] };
  perToken?: TokenMetrics[];
  hallucinationCandidates?: HallucinationCandidate[];
  highlightedTokenIdx?: number | null;
  onTokenClick?: (idx: number) => void;
}

// ─── Color Mapping (OKLCH space: green → yellow → red) ───

function confidenceToColor(confidence: number): string {
  // Green (high) → Yellow (medium) → Red (low)
  // Using OKLCH for perceptual uniformity
  if (confidence >= 0.8) {
    // High confidence: green shades
    const t = (confidence - 0.8) / 0.2;
    return `oklch(0.78 0.17 145 / ${0.25 + t * 0.35})`;
  } else if (confidence >= 0.5) {
    // Medium confidence: yellow shades
    const t = (confidence - 0.5) / 0.3;
    return `oklch(0.82 0.16 ${80 + t * 65} / ${0.35 + t * 0.15})`;
  } else if (confidence >= 0.3) {
    // Low-medium: orange
    const t = (confidence - 0.3) / 0.2;
    return `oklch(0.72 0.19 ${45 + t * 35} / ${0.4 + t * 0.1})`;
  } else {
    // Low confidence: red
    return `oklch(0.65 0.22 25 / ${0.5 + (0.3 - confidence) * 0.5})`;
  }
}

function confidenceToTextColor(confidence: number): string {
  if (confidence < 0.3) return "text-red-300";
  if (confidence < 0.5) return "text-amber-300";
  return "text-foreground";
}

// ─── Token Component ───

function HeatmapToken({
  token,
  logprob,
  topAlternatives,
  confidence,
  entropy,
  margin,
  isHallucinationRisk,
  idx,
  isHighlighted,
  isInHallucinationSegment,
  onClick,
}: {
  token: string;
  logprob: number;
  topAlternatives: Array<{ token: string; logprob: number }>;
  confidence: number;
  entropy?: number;
  margin?: number;
  isHallucinationRisk?: boolean;
  idx: number;
  isHighlighted: boolean;
  isInHallucinationSegment: boolean;
  onClick: () => void;
}) {
  const bgColor = confidenceToColor(confidence);
  const displayToken = token.replace(/\n/g, "↵\n").replace(/\t/g, "→  ");

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <span
          className={`inline-block cursor-pointer transition-all duration-150 rounded-sm font-mono text-[13px] leading-[1.7] px-[1px] ${
            isHighlighted ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
          } ${isInHallucinationSegment ? "underline decoration-red-400 decoration-wavy decoration-1 underline-offset-4" : ""}`}
          style={{ backgroundColor: bgColor }}
          onClick={onClick}
        >
          {displayToken}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="bg-card border-border text-foreground p-3 max-w-xs"
      >
        <div className="space-y-2">
          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <Badge
              variant="outline"
              className={`text-xs ${
                confidence >= 0.8
                  ? "border-green-500/50 text-green-400"
                  : confidence >= 0.5
                  ? "border-yellow-500/50 text-yellow-400"
                  : "border-red-500/50 text-red-400"
              }`}
            >
              {(confidence * 100).toFixed(1)}%
            </Badge>
            {isHallucinationRisk && (
              <Badge variant="destructive" className="text-[10px]">
                Risk
              </Badge>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-muted-foreground">Logprob</span>
              <p className="font-mono">{logprob.toFixed(4)}</p>
            </div>
            {entropy !== undefined && (
              <div>
                <span className="text-muted-foreground">Entropy</span>
                <p className="font-mono">{entropy.toFixed(4)}</p>
              </div>
            )}
            {margin !== undefined && (
              <div>
                <span className="text-muted-foreground">Margin</span>
                <p className="font-mono">{margin.toFixed(4)}</p>
              </div>
            )}
          </div>

          {/* Top alternatives */}
          {topAlternatives.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">
                Top alternatives:
              </p>
              <div className="space-y-0.5">
                {topAlternatives.slice(0, 5).map((alt, i) => {
                  const altConf = Math.exp(alt.logprob);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[11px] font-mono"
                    >
                      <span className="truncate max-w-[120px]">
                        "{alt.token.replace(/\n/g, "↵")}"
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {(altConf * 100).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main Heatmap Component ───

export default function TokenConfidenceHeatmap({
  logprobs,
  perToken,
  hallucinationCandidates,
  highlightedTokenIdx,
  onTokenClick,
}: Props) {
  const tokens = logprobs?.content ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Build a set of hallucination segment indices for quick lookup
  const hallucinationIndices = useMemo(() => {
    const indices = new Set<number>();
    if (hallucinationCandidates) {
      for (const hc of hallucinationCandidates) {
        for (let i = hc.start_token_idx; i <= hc.end_token_idx; i++) {
          indices.add(i);
        }
      }
    }
    return indices;
  }, [hallucinationCandidates]);

  const handleTokenClick = useCallback(
    (idx: number) => {
      setSelectedIdx(idx === selectedIdx ? null : idx);
      onTokenClick?.(idx);
    },
    [selectedIdx, onTokenClick]
  );

  if (tokens.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        No logprobs data available for this trace.
      </div>
    );
  }

  // Selected token detail panel
  const selectedToken = selectedIdx !== null ? tokens[selectedIdx] : null;
  const selectedMetrics = selectedIdx !== null && perToken ? perToken[selectedIdx] : null;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: "oklch(0.78 0.17 145 / 0.5)" }}
          />
          <span>High (&gt;80%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: "oklch(0.82 0.16 100 / 0.4)" }}
          />
          <span>Medium (50–80%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: "oklch(0.65 0.22 25 / 0.6)" }}
          />
          <span>Low (&lt;30%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-8 border-b-2 border-wavy border-red-400" />
          <span>Hallucination risk</span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-background rounded-lg border border-border p-3 max-h-[300px] overflow-y-auto">
        <div className="flex flex-wrap gap-0 leading-relaxed">
          {tokens.map((token, i) => {
            const confidence = Math.exp(token.logprob);
            const metrics = perToken?.[i];
            return (
              <HeatmapToken
                key={i}
                idx={i}
                token={token.token}
                logprob={token.logprob}
                topAlternatives={token.top_logprobs ?? []}
                confidence={metrics?.confidence ?? confidence}
                entropy={metrics?.entropy}
                margin={metrics?.margin}
                isHallucinationRisk={metrics?.is_hallucination_risk}
                isHighlighted={highlightedTokenIdx === i || selectedIdx === i}
                isInHallucinationSegment={hallucinationIndices.has(i)}
                onClick={() => handleTokenClick(i)}
              />
            );
          })}
        </div>
      </div>

      {/* Selected token detail */}
      {selectedToken && (
        <div className="bg-card/50 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Token #{selectedIdx}: "{selectedToken.token.replace(/\n/g, "↵")}"
            </p>
            <button
              onClick={() => setSelectedIdx(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          {/* Bar chart of alternatives */}
          {selectedToken.top_logprobs && selectedToken.top_logprobs.length > 0 && (
            <div className="space-y-1.5">
              {selectedToken.top_logprobs.slice(0, 5).map((alt, i) => {
                const prob = Math.exp(alt.logprob);
                const isChosen = alt.token === selectedToken.token;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono w-24 truncate text-right">
                      "{alt.token.replace(/\n/g, "↵")}"
                    </span>
                    <div className="flex-1 h-4 bg-background rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${
                          isChosen ? "bg-primary/60" : "bg-muted-foreground/30"
                        }`}
                        style={{ width: `${Math.max(prob * 100, 1)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono w-14 text-right text-muted-foreground">
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
