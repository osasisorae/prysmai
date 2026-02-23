import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface HallucinationCandidate {
  text: string;
  start_token_idx: number;
  end_token_idx: number;
  avg_confidence: number;
  avg_entropy: number;
}

interface TokenLogprob {
  token: string;
  logprob: number;
  top_logprobs?: Array<{ token: string; logprob: number }>;
}

interface Props {
  candidates: HallucinationCandidate[];
  tokens?: TokenLogprob[];
  overallConfidence: number;
  hallucinationRiskScore: number;
  onCandidateClick?: (startIdx: number) => void;
}

function riskLevel(score: number): { label: string; color: string; badgeVariant: "default" | "destructive" | "outline" | "secondary" } {
  if (score >= 0.3) return { label: "High Risk", color: "text-red-400", badgeVariant: "destructive" };
  if (score >= 0.1) return { label: "Medium Risk", color: "text-amber-400", badgeVariant: "secondary" };
  return { label: "Low Risk", color: "text-green-400", badgeVariant: "outline" };
}

function CandidateCard({
  candidate,
  tokens,
  onNavigate,
}: {
  candidate: HallucinationCandidate;
  tokens?: TokenLogprob[];
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Get surrounding context (5 tokens before and after)
  const contextBefore = tokens
    ? tokens
        .slice(Math.max(0, candidate.start_token_idx - 5), candidate.start_token_idx)
        .map((t) => t.token)
        .join("")
    : "";
  const contextAfter = tokens
    ? tokens
        .slice(candidate.end_token_idx + 1, candidate.end_token_idx + 6)
        .map((t) => t.token)
        .join("")
    : "";

  // Get alternative tokens at each position in the candidate
  const alternativeTokens = tokens
    ? tokens
        .slice(candidate.start_token_idx, candidate.end_token_idx + 1)
        .map((t, i) => ({
          position: candidate.start_token_idx + i,
          chosen: t.token,
          alternatives: (t.top_logprobs ?? [])
            .filter((a) => a.token !== t.token)
            .slice(0, 3)
            .map((a) => ({ token: a.token, prob: Math.exp(a.logprob) })),
        }))
    : [];

  return (
    <div className="border border-red-500/20 rounded-lg bg-red-500/[0.03] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Context with highlighted text */}
          <p className="text-sm font-mono leading-relaxed">
            <span className="text-muted-foreground">{contextBefore}</span>
            <span className="bg-red-500/20 text-red-300 px-0.5 rounded">
              {candidate.text}
            </span>
            <span className="text-muted-foreground">{contextAfter}</span>
          </p>
        </div>
        <Badge variant="destructive" className="text-[10px] shrink-0">
          {(candidate.avg_confidence * 100).toFixed(0)}% conf
        </Badge>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span>
          Tokens {candidate.start_token_idx}–{candidate.end_token_idx}
        </span>
        <span>Avg entropy: {candidate.avg_entropy.toFixed(3)}</span>
        <span>
          {candidate.end_token_idx - candidate.start_token_idx + 1} tokens
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onNavigate}
        >
          View in heatmap
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            window.open(
              `https://www.google.com/search?q=${encodeURIComponent(candidate.text)}`,
              "_blank"
            )
          }
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Verify
        </Button>
        {alternativeTokens.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={() => setExpanded(!expanded)}
          >
            Alternatives
            {expanded ? (
              <ChevronUp className="w-3 h-3 ml-1" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded alternatives */}
      {expanded && alternativeTokens.length > 0 && (
        <div className="bg-background/50 rounded border border-border p-2 space-y-1.5">
          <p className="text-[11px] text-muted-foreground font-medium">
            Alternative tokens at each position:
          </p>
          {alternativeTokens.map((at, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-muted-foreground w-6 text-right">
                #{at.position}
              </span>
              <span className="text-red-300">"{at.chosen}"</span>
              <span className="text-muted-foreground">→</span>
              {at.alternatives.map((alt, j) => (
                <span key={j} className="text-green-400/70">
                  "{alt.token}" ({(alt.prob * 100).toFixed(1)}%)
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HallucinationDetectorPanel({
  candidates,
  tokens,
  overallConfidence,
  hallucinationRiskScore,
  onCandidateClick,
}: Props) {
  const risk = riskLevel(hallucinationRiskScore);

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${risk.color}`} />
          <span className="text-sm font-medium">Hallucination Detection</span>
          <Badge variant={risk.badgeVariant} className="text-[10px]">
            {risk.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            Risk score:{" "}
            <span className={`font-mono ${risk.color}`}>
              {(hallucinationRiskScore * 100).toFixed(1)}%
            </span>
          </span>
          <span>
            Overall confidence:{" "}
            <span className="font-mono text-foreground">
              {(overallConfidence * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* Candidates list */}
      {candidates.length > 0 ? (
        <div className="space-y-2">
          {candidates.map((candidate, i) => (
            <CandidateCard
              key={i}
              candidate={candidate}
              tokens={tokens}
              onNavigate={() => onCandidateClick?.(candidate.start_token_idx)}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic py-2">
          No hallucination candidates detected. The model appears confident in
          this completion.
        </div>
      )}
    </div>
  );
}
