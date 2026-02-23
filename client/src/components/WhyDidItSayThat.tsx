import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Highlight {
  tokenIdx: number;
  annotation: string;
  color: string;
}

interface Props {
  traceDbId: number;
  provider: string;
  onHighlightToken?: (idx: number | null) => void;
}

export default function WhyDidItSayThat({ traceDbId, provider, onHighlightToken }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [cached, setCached] = useState(false);
  const [reportType, setReportType] = useState<string>("");

  const explainMutation = trpc.explainability.getExplanation.useMutation({
    onSuccess: (data) => {
      setExplanation(data.explanation);
      setHighlights((data.highlights as Highlight[]) ?? []);
      setCached(data.cached);
      setReportType(data.reportType ?? "");
      setIsOpen(true);
    },
  });

  const handleGenerate = (regenerate: boolean = false) => {
    explainMutation.mutate({ traceId: traceDbId, regenerate });
  };

  const isEstimated = provider === "anthropic";

  return (
    <div className="space-y-2">
      {/* Trigger button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => {
            if (explanation && isOpen) {
              setIsOpen(false);
            } else if (explanation) {
              setIsOpen(true);
            } else {
              handleGenerate(false);
            }
          }}
          disabled={explainMutation.isPending}
        >
          {explainMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-3 h-3" />
              Why did it say that?
              {explanation && (isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </>
          )}
        </Button>

        {explanation && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => handleGenerate(true)}
            disabled={explainMutation.isPending}
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </Button>
        )}

        {cached && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Cached
          </Badge>
        )}

        {isEstimated && (
          <Badge variant="secondary" className="text-[10px]">
            Estimated (no logprobs)
          </Badge>
        )}
      </div>

      {/* Error state */}
      {explainMutation.isError && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded-md p-2">
          Failed to generate explanation: {explainMutation.error?.message ?? "Unknown error"}
        </div>
      )}

      {/* Explanation panel */}
      {isOpen && explanation && (
        <div className="bg-card/50 rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Model Behavior Analysis</span>
            </div>
            {reportType && (
              <Badge variant="outline" className="text-[10px]">
                {reportType === "estimated" ? "Text-based estimation" : "Logprobs analysis"}
              </Badge>
            )}
          </div>

          {/* Explanation text with interactive highlights */}
          <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {explanation}
          </div>

          {/* Highlight annotations */}
          {highlights.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground font-medium">
                Key annotations ({highlights.length}):
              </p>
              <div className="space-y-1">
                {highlights.slice(0, 10).map((h, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-2 text-[11px] hover:bg-accent/30 rounded px-1.5 py-0.5 transition-colors w-full text-left"
                    onMouseEnter={() => onHighlightToken?.(h.tokenIdx)}
                    onMouseLeave={() => onHighlightToken?.(null)}
                    onClick={() => onHighlightToken?.(h.tokenIdx)}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: h.color }}
                    />
                    <span className="text-muted-foreground">
                      Token #{h.tokenIdx}:
                    </span>
                    <span className="text-foreground/80 truncate">
                      {h.annotation}
                    </span>
                  </button>
                ))}
                {highlights.length > 10 && (
                  <p className="text-[10px] text-muted-foreground pl-5">
                    ...and {highlights.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
