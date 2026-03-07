/**
 * Policy Manager — CRUD for governance policies.
 *
 * Lets users create, edit, enable/disable, and delete governance policies
 * that control agent behavior, security, cost limits, and compliance.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Eye,
  ShieldAlert,
  ShieldOff,
  Brain,
  DollarSign,
  Lock,
  Terminal,
  FileText,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───

const POLICY_TYPES = [
  { value: "behavioral", label: "Behavioral", icon: Brain, color: "text-primary" },
  { value: "security", label: "Security", icon: Shield, color: "text-red-400" },
  { value: "cost", label: "Cost", icon: DollarSign, color: "text-amber-400" },
  { value: "model_access", label: "Model Access", icon: Lock, color: "text-violet-400" },
  { value: "tool_access", label: "Tool Access", icon: Terminal, color: "text-blue-400" },
  { value: "content", label: "Content", icon: FileText, color: "text-green-400" },
  { value: "compliance", label: "Compliance", icon: Scale, color: "text-amber-400" },
] as const;

const ENFORCEMENT_LEVELS = [
  { value: "monitor", label: "Monitor", icon: Eye, desc: "Log only, no action" },
  { value: "warn", label: "Warn", icon: AlertTriangle, desc: "Alert but allow" },
  { value: "block", label: "Block", icon: ShieldOff, desc: "Prevent execution" },
] as const;

function enforcementColor(enforcement: string): string {
  switch (enforcement) {
    case "monitor":
      return "text-blue-400 border-blue-500/30";
    case "warn":
      return "text-amber-400 border-amber-500/30";
    case "block":
      return "text-red-400 border-red-500/30";
    default:
      return "text-muted-foreground";
  }
}

function policyTypeIcon(type: string) {
  const pt = POLICY_TYPES.find((p) => p.value === type);
  if (!pt) return <Shield className="w-4 h-4" />;
  const Icon = pt.icon;
  return <Icon className={`w-4 h-4 ${pt.color}`} />;
}

// ─── Create/Edit Dialog ───

function PolicyDialog({
  projectId,
  editPolicy,
  open,
  onOpenChange,
  onSuccess,
}: {
  projectId: number;
  editPolicy?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(editPolicy?.name ?? "");
  const [description, setDescription] = useState(editPolicy?.description ?? "");
  const [policyType, setPolicyType] = useState(editPolicy?.policyType ?? "behavioral");
  const [enforcement, setEnforcement] = useState(editPolicy?.enforcement ?? "monitor");
  const [rulesJson, setRulesJson] = useState(
    editPolicy?.rules ? JSON.stringify(editPolicy.rules, null, 2) : '{\n  "threshold": 60\n}'
  );

  const createMutation = trpc.governance.createPolicy.useMutation();
  const updateMutation = trpc.governance.updatePolicy.useMutation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Policy name is required");
      return;
    }

    let rules: Record<string, unknown>;
    try {
      rules = JSON.parse(rulesJson);
    } catch {
      toast.error("Invalid JSON in rules");
      return;
    }

    try {
      if (editPolicy) {
        await updateMutation.mutateAsync({
          policyId: editPolicy.id,
          name,
          description: description || undefined,
          rules,
          enforcement: enforcement as any,
        });
        toast.success("Policy updated");
      } else {
        await createMutation.mutateAsync({
          projectId,
          name,
          description: description || undefined,
          policyType: policyType as any,
          rules,
          enforcement: enforcement as any,
        });
        toast.success("Policy created");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save policy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
            {editPolicy ? "Edit Policy" : "Create Policy"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Min Behavior Score"
              className="bg-background border-border"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="bg-background border-border"
            />
          </div>

          {/* Policy Type (only for create) */}
          {!editPolicy && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={policyType} onValueChange={setPolicyType}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      <span className="flex items-center gap-2">
                        <pt.icon className={`w-3.5 h-3.5 ${pt.color}`} />
                        {pt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Enforcement */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Enforcement</label>
            <Select value={enforcement} onValueChange={setEnforcement}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENFORCEMENT_LEVELS.map((el) => (
                  <SelectItem key={el.value} value={el.value}>
                    <span className="flex items-center gap-2">
                      <el.icon className="w-3.5 h-3.5" />
                      {el.label}
                      <span className="text-muted-foreground text-xs">— {el.desc}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rules JSON */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Rules (JSON)</label>
            <textarea
              value={rulesJson}
              onChange={(e) => setRulesJson(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder='{ "threshold": 60 }'
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-primary text-primary-foreground"
          >
            {editPolicy ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───

export default function PolicyManager({ projectId }: { projectId: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<any>(null);

  const policies = trpc.governance.listPolicies.useQuery({ projectId });
  const deleteMutation = trpc.governance.deletePolicy.useMutation();
  const toggleMutation = trpc.governance.updatePolicy.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async (policyId: number) => {
    if (!confirm("Delete this policy?")) return;
    try {
      await deleteMutation.mutateAsync({ policyId });
      toast.success("Policy deleted");
      utils.governance.listPolicies.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    }
  };

  const handleToggle = async (policyId: number, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ policyId, enabled });
      utils.governance.listPolicies.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to toggle");
    }
  };

  const handleEdit = (policy: any) => {
    setEditPolicy(policy);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditPolicy(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Policy Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define rules that govern agent behavior, security, and compliance
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1.5" />
          New Policy
        </Button>
      </div>

      {/* Policy List */}
      {policies.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : policies.data && policies.data.length > 0 ? (
        <div className="space-y-3">
          {policies.data.map((policy) => (
            <Card
              key={policy.id}
              className={`bg-card border-border ${!policy.enabled ? "opacity-50" : ""}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">{policyTypeIcon(policy.policyType)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium truncate">{policy.name}</h3>
                        <Badge variant="outline" className={`text-[10px] ${enforcementColor(policy.enforcement ?? "monitor")}`}>
                          {policy.enforcement}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {policy.policyType.replace("_", " ")}
                        </Badge>
                      </div>
                      {policy.description && (
                        <p className="text-xs text-muted-foreground truncate">{policy.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={policy.enabled ?? true}
                      onCheckedChange={(checked) => handleToggle(policy.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground mb-1">No policies configured</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create policies to govern agent behavior, enforce security rules, and ensure compliance
            </p>
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Policy
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Violations summary */}
      <ViolationsSummary projectId={projectId} />

      {/* Create/Edit Dialog */}
      <PolicyDialog
        projectId={projectId}
        editPolicy={editPolicy}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => utils.governance.listPolicies.invalidate()}
      />
    </div>
  );
}

// ─── Violations Summary ───

function ViolationsSummary({ projectId }: { projectId: number }) {
  const violations = trpc.governance.listViolations.useQuery({
    projectId,
    limit: 10,
  });

  if (violations.isLoading) return <Skeleton className="h-20 w-full" />;
  if (!violations.data?.violations.length) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          Recent Violations ({violations.data.total})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {violations.data.violations.map((v) => (
            <div
              key={v.id}
              className={`p-3 rounded-md border ${
                v.severity === "critical"
                  ? "border-red-500/30 bg-red-500/5"
                  : v.severity === "high"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-background/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    v.severity === "critical"
                      ? "text-red-400 border-red-500/30"
                      : v.severity === "high"
                      ? "text-amber-400 border-amber-500/30"
                      : "text-muted-foreground"
                  }`}
                >
                  {v.severity}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {v.detectedAt ? new Date(v.detectedAt).toLocaleString() : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{v.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
