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
import { Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "anthropic", label: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  { value: "google", label: "Google AI", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { value: "custom", label: "Custom / OpenAI-compatible", baseUrl: "" },
];

export default function Settings({ projectId }: { projectId: number }) {
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
      // Don't populate the API key — it's encrypted
    }
  }, [project.data]);

  const handleSave = () => {
    updateConfig.mutate({
      projectId,
      providerConfig: {
        provider,
        baseUrl,
        defaultModel: provider === "openai" ? "gpt-4o-mini" : undefined,
        ...(apiKey.trim() ? { apiKeyEncrypted: apiKey } : {}),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your project and LLM provider connection</p>
      </div>

      {/* Project Info */}
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

      {/* Provider Config */}
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

      {/* Proxy Endpoint Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Proxy Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">Your proxy base URL</p>
            <p className="font-mono text-sm text-primary">
              {typeof window !== 'undefined' ? window.location.origin : ''}/v1
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Point your application to this URL instead of your provider's API. Use your Prysm API key for authentication.
            All requests will be forwarded to {PROVIDERS.find(p => p.value === provider)?.label ?? "your provider"} and logged for observability.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
