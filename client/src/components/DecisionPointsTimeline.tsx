import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface DecisionPoint {
  token_idx: number;
  chosen: string;
  alternative: string;
  chosen_confidence: number;
  alternative_confidence: number;
  margin: number;
}

interface Props {
  decisionPoints: DecisionPoint[];
  totalTokens: number;
  onPointClick?: (tokenIdx: number) => void;
}

export default function DecisionPointsTimeline({
  decisionPoints,
  totalTokens,
  onPointClick,
}: Props) {
  // Sort by token index
  const sorted = useMemo(
    () => [...decisionPoints].sort((a, b) => a.token_idx - b.token_idx),
    [decisionPoints]
  );

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        No significant decision points detected. The model was consistently
        confident in its token choices.
      </div>
    );
  }

  // Marker size: smaller margin = bigger marker (more interesting)
  const markerSize = (margin: number) => {
    if (margin < 0.02) return 14;
    if (margin < 0.05) return 11;
    if (margin < 0.08) return 9;
    return 7;
  };

  const markerColor = (margin: number) => {
    if (margin < 0.02) return "bg-red-400";
    if (margin < 0.05) return "bg-amber-400";
    return "bg-yellow-400/70";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Decision Points Timeline</p>
        <Badge variant="outline" className="text-[10px]">
          {sorted.length} decision{sorted.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Track */}
        <div className="h-1 bg-border rounded-full w-full" />

        {/* Markers */}
        <div className="absolute inset-0 flex items-center">
          {sorted.map((dp, i) => {
            const leftPercent = totalTokens > 0 ? (dp.token_idx / totalTokens) * 100 : 0;
            const size = markerSize(dp.margin);
            const color = markerColor(dp.margin);

            return (
              <Tooltip key={i} delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    className={`absolute ${color} rounded-full cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      transform: "translate(-50%, -50%)",
                      top: "50%",
                    }}
                    onClick={() => onPointClick?.(dp.token_idx)}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-card border-border text-foreground p-2 max-w-xs"
                >
                  <div className="space-y-1 text-[11px]">
                    <p className="font-medium">
                      Token #{dp.token_idx}
                    </p>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-primary">
                        "{dp.chosen}" ({(dp.chosen_confidence * 100).toFixed(1)}%)
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="text-amber-400">
                        "{dp.alternative}" ({(dp.alternative_confidence * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Margin: {(dp.margin * 100).toFixed(1)}%
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Start/End labels */}
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
          <span>Token 0</span>
          <span>Token {totalTokens}</span>
        </div>
      </div>

      {/* Decision points list */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {sorted.map((dp, i) => (
          <button
            key={i}
            onClick={() => onPointClick?.(dp.token_idx)}
            className="flex items-center gap-2 text-[11px] w-full text-left hover:bg-accent/30 rounded px-2 py-1 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${markerColor(dp.margin)}`}
            />
            <span className="text-muted-foreground w-12">#{dp.token_idx}</span>
            <span className="font-mono text-primary truncate">
              "{dp.chosen}"
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono text-amber-400 truncate">
              "{dp.alternative}"
            </span>
            <span className="text-muted-foreground ml-auto">
              Δ{(dp.margin * 100).toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
