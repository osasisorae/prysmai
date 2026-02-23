import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  Bell,
  Users,
  BarChart3,
  Settings2,
  Plus,
  Trash2,
  Mail,
  UserPlus,
  Crown,
  User,
  DollarSign,
  Brain,
} from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "anthropic", label: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  { value: "google", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { value: "custom", label: "Custom / OpenAI-compatible", baseUrl: "" },
];

const TABS = [
  { id: "provider", label: "Provider", icon: Settings2 },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "usage", label: "Usage", icon: BarChart3 },
  { id: "explainability", label: "Explainability", icon: Brain },
];

// ═══════════════════════════════════════════════════════════════
// PROVIDER CONFIG TAB
// ═══════════════════════════════════════════════════════════════

function ProviderTab({ projectId }: { projectId: number }) {
  const project = trpc.project.get.useQuery({ id: projectId });
  const updateConfig = trpc.project.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Settings saved.");
      project.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [provider, setProvider] = useState("openai");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (project.data?.providerConfig) {
      const config = project.data.providerConfig as any;
      setProvider(config.provider ?? "openai");
      setBaseUrl(config.baseUrl ?? "https://api.openai.com/v1");
    }
  }, [project.data]);

  const handleSave = () => {
    updateConfig.mutate({
      projectId,
      providerConfig: {
        provider,
        baseUrl,
        defaultModel: provider === "openai" ? "gpt-4o-mini" : provider === "google" ? "gemini-2.5-flash" : undefined,
        ...(apiKey.trim() ? { apiKeyEncrypted: apiKey } : {}),
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p className="text-sm font-medium">{project.data?.name ?? "—"}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Slug</Label>
              <p className="text-sm font-mono">{project.data?.slug ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">LLM Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v);
                const p = PROVIDERS.find((p) => p.value === v);
                if (p && p.baseUrl) setBaseUrl(p.baseUrl);
              }}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="bg-background border-border font-mono text-sm"
              disabled={provider !== "custom"}
            />
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="Enter new key to update (leave blank to keep current)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-background border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your upstream provider API key. Stored encrypted. Leave blank to keep the existing key.
            </p>
          </div>

          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Proxy Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">Your proxy base URL</p>
            <p className="font-mono text-sm text-primary">
              {typeof window !== "undefined" ? window.location.origin : ""}/api/v1
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Point your application to this URL instead of your provider's API. Use your Prysm API key for authentication.
            All requests will be forwarded to{" "}
            {PROVIDERS.find((p) => p.value === provider)?.label ?? "your provider"} and logged for observability.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM PRICING TAB
// ═══════════════════════════════════════════════════════════════

const COMMON_MODELS = [
  { provider: "openai", model: "gpt-4o", label: "GPT-4o" },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o Mini" },
  { provider: "openai", model: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { provider: "anthropic", model: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { provider: "anthropic", model: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { provider: "google", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { provider: "google", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { provider: "google", model: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { provider: "vllm", model: "llama-3.1-70b", label: "Llama 3.1 70B" },
  { provider: "ollama", model: "llama3", label: "Ollama Llama 3" },
];

function PricingTab({ projectId }: { projectId: number }) {
  const pricing = trpc.pricing.list.useQuery({ projectId });
  const utils = trpc.useUtils();
  const upsertMut = trpc.pricing.upsert.useMutation({
    onSuccess: () => {
      utils.pricing.list.invalidate({ projectId });
      toast.success("Pricing saved");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMut = trpc.pricing.delete.useMutation({
    onSuccess: () => {
      utils.pricing.list.invalidate({ projectId });
      toast.success("Pricing entry removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [inputCost, setInputCost] = useState("");
  const [outputCost, setOutputCost] = useState("");

  const resetForm = () => {
    setProvider("");
    setModel("");
    setInputCost("");
    setOutputCost("");
  };

  const handleQuickFill = (m: typeof COMMON_MODELS[0]) => {
    setProvider(m.provider);
    setModel(m.model);
  };

  const handleSave = () => {
    if (!provider || !model || !inputCost || !outputCost) {
      toast.error("All fields are required");
      return;
    }
    const inputNum = parseFloat(inputCost);
    const outputNum = parseFloat(outputCost);
    if (isNaN(inputNum) || isNaN(outputNum) || inputNum < 0 || outputNum < 0) {
      toast.error("Costs must be valid non-negative numbers");
      return;
    }
    upsertMut.mutate({
      projectId,
      provider,
      model,
      inputCostPer1k: inputCost,
      outputCostPer1k: outputCost,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Custom Model Pricing</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set custom cost-per-token rates for open-source or self-hosted models.
                These override default pricing for cost tracking.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Pricing
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Pricing</DialogTitle>
                  <DialogDescription>
                    Set input and output cost per 1,000 tokens for a model.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Quick fill buttons */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Quick Fill</label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_MODELS.map((m) => (
                        <button
                          key={`${m.provider}-${m.model}`}
                          onClick={() => handleQuickFill(m)}
                          className="px-2 py-1 text-xs rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Provider</label>
                      <Input
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        placeholder="e.g. vllm, ollama, openai"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Model</label>
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="e.g. llama-3.1-70b"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Input Cost / 1K tokens ($)</label>
                      <Input
                        type="number"
                        step="0.000001"
                        min="0"
                        value={inputCost}
                        onChange={(e) => setInputCost(e.target.value)}
                        placeholder="0.000150"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Output Cost / 1K tokens ($)</label>
                      <Input
                        type="number"
                        step="0.000001"
                        min="0"
                        value={outputCost}
                        onChange={(e) => setOutputCost(e.target.value)}
                        placeholder="0.000600"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    For self-hosted models with no API cost, set both to 0. For open-source models
                    on inference providers, enter the provider's per-token rate.
                  </p>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={upsertMut.isPending}>
                      {upsertMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      Save Pricing
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {pricing.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          ) : pricing.data && pricing.data.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Model</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Input / 1K</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Output / 1K</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Updated</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {pricing.data.map((entry: any) => (
                    <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs">{entry.model}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        ${parseFloat(entry.inputCostPer1k).toFixed(6)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        ${parseFloat(entry.outputCostPer1k).toFixed(6)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => deleteMut.mutate({ id: entry.id, projectId })}
                          className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <DollarSign className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No custom pricing configured</p>
              <p className="text-xs mt-1">
                Add custom rates for self-hosted or open-source models to track costs accurately.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-card/50 border-border">
        <CardContent className="pt-5">
          <h3 className="text-sm font-medium mb-2">How pricing works</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Custom pricing overrides default rates for cost calculation in the proxy.</li>
            <li>• Default pricing is included for popular OpenAI and Anthropic models.</li>
            <li>• For self-hosted models (vLLM, Ollama), set rates based on your infrastructure cost or set to $0.</li>
            <li>• Costs are calculated as: (input_tokens / 1000) × input_rate + (output_tokens / 1000) × output_rate</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALERTS TAB
// ═══════════════════════════════════════════════════════════════

function AlertsTab({ projectId }: { projectId: number }) {
  const alerts = trpc.alert.list.useQuery({ projectId });
  const utils = trpc.useUtils();

  const createAlert = trpc.alert.create.useMutation({
    onSuccess: () => {
      toast.success("Alert created.");
      utils.alert.list.invalidate();
      setShowCreate(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateAlert = trpc.alert.update.useMutation({
    onSuccess: () => {
      toast.success("Alert updated.");
      utils.alert.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAlert = trpc.alert.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert deleted.");
      utils.alert.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    metric: "error_rate",
    condition: "gt",
    threshold: "5",
    channels: { email: true },
  });

  const METRICS = [
    { value: "error_rate", label: "Error Rate (%)" },
    { value: "latency_p95", label: "P95 Latency (ms)" },
    { value: "latency_p99", label: "P99 Latency (ms)" },
    { value: "cost_per_hour", label: "Cost per Hour ($)" },
    { value: "request_count", label: "Request Count (per hour)" },
  ];

  const CONDITIONS = [
    { value: "gt", label: "Greater than" },
    { value: "gte", label: "Greater than or equal" },
    { value: "lt", label: "Less than" },
    { value: "lte", label: "Less than or equal" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Alert Rules</h2>
          <p className="text-sm text-muted-foreground">
            Get notified when metrics exceed your thresholds
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Alert Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., High Error Rate"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select
                    value={newAlert.metric}
                    onValueChange={(v) => setNewAlert({ ...newAlert, metric: v })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={newAlert.condition}
                    onValueChange={(v) => setNewAlert({ ...newAlert, condition: v })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Threshold</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Notification Channels</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAlert.channels.email}
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          channels: { ...newAlert.channels, email: e.target.checked },
                        })
                      }
                      className="rounded"
                    />
                    <Mail className="w-4 h-4" /> Email
                  </label>
                </div>
              </div>
              <Button
                onClick={() =>
                  createAlert.mutate({
                    projectId,
                    name: newAlert.name,
                    metric: newAlert.metric,
                    condition: newAlert.condition,
                    threshold: newAlert.threshold,
                    channels: newAlert.channels,
                  })
                }
                disabled={createAlert.isPending || !newAlert.name.trim()}
                className="w-full"
              >
                {createAlert.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {alerts.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardContent className="pt-6 h-20" />
            </Card>
          ))}
        </div>
      ) : alerts.data && alerts.data.length > 0 ? (
        <div className="space-y-3">
          {alerts.data.map((alert: any) => (
            <Card key={alert.id} className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-sm">{alert.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                        {alert.metric} {alert.condition} {alert.threshold}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Channels: {Object.keys(alert.channels || {}).filter((k: string) => (alert.channels as any)[k]).join(", ") || "none"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={(checked) =>
                        updateAlert.mutate({
                          id: alert.id,
                          projectId,
                          enabled: checked,
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert.mutate({ id: alert.id, projectId })}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
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
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No alert rules configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create an alert to get notified when metrics exceed your thresholds
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEAM TAB
// ═══════════════════════════════════════════════════════════════

function TeamTab() {
  const members = trpc.team.list.useQuery();
  const utils = trpc.useUtils();

  const inviteMember = trpc.team.invite.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent.");
      utils.team.list.invalidate();
      setShowInvite(false);
      setInviteEmail("");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = trpc.team.remove.useMutation({
    onSuccess: () => {
      toast.success("Member removed.");
      utils.team.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access to your organization
          </p>
        </div>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => inviteMember.mutate({ email: inviteEmail, role: inviteRole })}
                disabled={inviteMember.isPending || !inviteEmail.includes("@")}
                className="w-full"
              >
                {inviteMember.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {members.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardContent className="pt-6 h-16" />
            </Card>
          ))}
        </div>
      ) : members.data && members.data.length > 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {members.data.map((member: any, i: number) => (
              <div
                key={member.id}
                className={`flex items-center justify-between py-3 px-4 ${
                  i < members.data!.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {member.role === "owner" ? (
                      <Crown className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.userName ?? member.email ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email ?? ""} · {member.role}
                      {member.status === "pending" && (
                        <span className="ml-2 text-yellow-400">(pending invite)</span>
                      )}
                    </p>
                  </div>
                </div>
                {member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember.mutate({ memberId: member.id })}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No team members yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Invite colleagues to collaborate on your projects
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USAGE TAB
// ═══════════════════════════════════════════════════════════════

function UsageTab() {
  const usage = trpc.usage.get.useQuery();

  const FREE_LIMIT = 10000;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Usage & Billing</h2>
        <p className="text-sm text-muted-foreground">
          Track your API usage and manage your plan
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Current Billing Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {usage.isLoading ? (
            <div className="h-20 animate-pulse bg-muted rounded" />
          ) : usage.data ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Requests Used</p>
                  <p className="text-2xl font-semibold">
                    {(usage.data.totalRequests ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Limit</p>
                  <p className="text-2xl font-semibold">{FREE_LIMIT.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-sm font-medium mt-1">
                    {usage.data.period?.start
                      ? new Date(usage.data.period.start).toLocaleDateString()
                      : "—"}{" "}
                    –{" "}
                    {usage.data.period?.end
                      ? new Date(usage.data.period.end).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (usage.data.totalRequests ?? 0) / FREE_LIMIT > 0.9
                        ? "bg-red-500"
                        : (usage.data.totalRequests ?? 0) / FREE_LIMIT > 0.7
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(((usage.data.totalRequests ?? 0) / FREE_LIMIT) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {(((usage.data.totalRequests ?? 0) / FREE_LIMIT) * 100).toFixed(1)}% of free tier used
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No usage data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Free Tier</p>
              <p className="text-sm text-muted-foreground">
                10,000 requests/month · All features included
              </p>
            </div>
            <Button variant="outline" onClick={() => toast.info("Pro plan coming soon!")}>
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPLAINABILITY TAB
// ═══════════════════════════════════════════════════════════════

function ExplainabilityTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.explainability.getSettings.useQuery({ projectId });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [injection, setInjection] = useState<string | null>(null);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  // Sync local state with server data
  const effectiveEnabled = enabled ?? config?.enabled ?? true;
  const effectiveInjection = injection ?? config?.logprobsInjection ?? "always";
  const effectiveSampleRate = sampleRate ?? (config?.sampleRate ? config.sampleRate * 100 : 100);

  const updateMutation = trpc.explainability.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Explainability settings saved");
      utils.explainability.getSettings.invalidate({ projectId });
      // Reset local overrides
      setEnabled(null);
      setInjection(null);
      setSampleRate(null);
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      projectId,
      enabled: effectiveEnabled,
      logprobsInjection: effectiveInjection as "always" | "never" | "sample",
      sampleRate: effectiveSampleRate / 100,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 w-full bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Explainability Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable explainability */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Explainability</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, the proxy will capture logprobs and compute confidence analysis for traces
              </p>
            </div>
            <Switch
              checked={effectiveEnabled}
              onCheckedChange={(v) => setEnabled(v)}
            />
          </div>

          {effectiveEnabled && (
            <>
              {/* Logprobs injection mode */}
              <div className="space-y-2">
                <Label>Logprobs Injection</Label>
                <p className="text-xs text-muted-foreground">
                  Controls when the proxy injects logprobs parameters into upstream requests
                </p>
                <Select
                  value={effectiveInjection}
                  onValueChange={(v) => setInjection(v)}
                >
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always</SelectItem>
                    <SelectItem value="sample">Sample at rate</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sample rate (only visible when "sample" is selected) */}
              {effectiveInjection === "sample" && (
                <div className="space-y-2">
                  <Label>Sample Rate: {effectiveSampleRate}%</Label>
                  <p className="text-xs text-muted-foreground">
                    Percentage of requests that will have logprobs injected
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={effectiveSampleRate}
                    onChange={(e) => setSampleRate(parseInt(e.target.value))}
                    className="w-48 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground ml-2">{effectiveSampleRate}%</span>
                </div>
              )}

            </>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-card/50 border-border">
        <CardContent className="py-4">
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">How Explainability Works</p>
            <p>
              <strong>OpenAI &amp; Gemini:</strong> The proxy injects <code className="text-primary">logprobs: true</code> and{" "}
              <code className="text-primary">top_logprobs: 5</code> into upstream requests. This provides native token-level
              confidence data with no additional cost.
            </p>
            <p>
              <strong>Anthropic:</strong> Anthropic does not support logprobs. The system uses text-based
              confidence estimation to provide approximate analysis. Results are labeled as "estimated."
            </p>
            <p>
              <strong>Sampling:</strong> Use "Sample at rate" to reduce overhead on high-volume projects.
              Only sampled requests will have logprobs captured and analyzed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════

export default function Settings({ projectId }: { projectId: number }) {
  const [activeTab, setActiveTab] = useState("provider");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your project, alerts, team, and usage
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "provider" && <ProviderTab projectId={projectId} />}
      {activeTab === "pricing" && <PricingTab projectId={projectId} />}
      {activeTab === "alerts" && <AlertsTab projectId={projectId} />}
      {activeTab === "team" && <TeamTab />}
      {activeTab === "usage" && <UsageTab />}
      {activeTab === "explainability" && <ExplainabilityTab projectId={projectId} />}
    </div>
  );
}
