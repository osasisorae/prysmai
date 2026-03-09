/**
 * Resource Access Control Dashboard
 * 
 * Displays unauthorized tool, domain, and file access violations.
 * Tabs: Overview (summary by category) | Violation Log (paginated table)
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Shield,
  Globe,
  FileWarning,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  tool: <Wrench className="w-4 h-4" />,
  domain: <Globe className="w-4 h-4" />,
  file: <FileWarning className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  unauthorized_tool: "Unauthorized Tool",
  blocked_tool: "Blocked Tool",
  unauthorized_domain: "Unauthorized Domain",
  blocked_domain: "Blocked Domain",
  unauthorized_file: "Unauthorized File",
  blocked_file: "Blocked File",
};

export default function ResourceAccess({ projectId }: Props) {
  const [tab, setTab] = useState<"overview" | "violations">("overview");
  const [violationType, setViolationType] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const summary = trpc.detectors.getResourceAccessSummary.useQuery(
    { projectId },
    { staleTime: 30_000 }
  );

  const violations = trpc.detectors.listResourceViolations.useQuery(
    {
      projectId,
      violationType: violationType !== "all" ? violationType as any : undefined,
      resourceCategory: category !== "all" ? category as any : undefined,
      severity: severity !== "all" ? severity as any : undefined,
      status: status !== "all" ? status as any : undefined,
      limit,
      offset: page * limit,
    },
    { staleTime: 15_000 }
  );

  const resolve = trpc.detectors.resolveResourceViolation.useMutation({
    onSuccess: () => {
      toast.success("Violation updated");
      violations.refetch();
      summary.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Lock className="w-6 h-6 text-primary" />
          Resource Access Control
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define allowed resource envelopes for your agents. Detect unauthorized tool, domain, and file access in real time.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "violations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" ? "Overview" : "Violation Log"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* By Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["tool", "domain", "file"] as const).map((cat) => {
              const count = summary.data?.byCategory?.find(c => c.category === cat)?.count ?? 0;
              return (
                <div key={cat} className="border border-border rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    {CATEGORY_ICONS[cat]}
                    <span className="text-sm font-medium capitalize">{cat} Access</span>
                  </div>
                  {summary.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="text-3xl font-bold">{count}</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">violations detected</p>
                </div>
              );
            })}
          </div>

          {/* Top Offending Resources */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Most Frequently Violated Resources</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.topResources?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No resource access violations detected. Your agents are operating within their defined boundaries.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.data?.topResources?.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-mono truncate max-w-[300px]">{r.resourceName}</span>
                    <Badge variant="outline" className="text-xs">{r.count} violation{r.count !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Violation Type */}
          <div className="border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-4">Violations by Type</h3>
            {summary.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (summary.data?.byType?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No violations to display.</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {summary.data?.byType?.map((t) => (
                  <div key={t.violationType} className="px-4 py-2 rounded-lg border border-border bg-muted/20">
                    <span className="text-lg font-bold">{t.count}</span>
                    <span className="text-xs ml-2">{TYPE_LABELS[t.violationType] ?? t.violationType}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "violations" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={category} onValueChange={v => { setCategory(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="domain">Domain</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={v => { setSeverity(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Violations Table */}
          {violations.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (violations.data?.violations?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No violations found matching your filters.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Resource</th>
                    <th className="text-left px-4 py-3 font-medium">Category</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {violations.data?.violations?.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]">{v.resourceName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {CATEGORY_ICONS[v.resourceCategory]}
                          <span className="text-xs capitalize">{v.resourceCategory}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{TYPE_LABELS[v.violationType] ?? v.violationType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[v.severity]}`}>
                          {v.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs capitalize ${v.status === "open" ? "text-amber-400" : "text-muted-foreground"}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(v.detectedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {v.status === "open" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ violationId: v.id, status: "acknowledged" })}
                              disabled={resolve.isPending}
                            >
                              <Check className="w-3 h-3 mr-1" /> Ack
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => resolve.mutate({ violationId: v.id, status: "resolved" })}
                              disabled={resolve.isPending}
                            >
                              Resolve
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {(violations.data?.total ?? 0) > limit && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, violations.data?.total ?? 0)} of {violations.data?.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * limit >= (violations.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
