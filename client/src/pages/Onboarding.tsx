import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
import { toast } from "sonner";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "anthropic", label: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  { value: "google", label: "Google AI", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { value: "custom", label: "Custom / OpenAI-compatible", baseUrl: "" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [showKey, setShowKey] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");

  const createOrg = trpc.org.create.useMutation();
  const createProject = trpc.project.create.useMutation();
  const updateConfig = trpc.project.updateConfig.useMutation();

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleComplete = async () => {
    try {
      // Step 1: Create org
      const org = await createOrg.mutateAsync({
        name: orgName,
        slug: slugify(orgName),
      });

      // Step 2: Create project
      const project = await createProject.mutateAsync({
        name: projectName,
        slug: slugify(projectName),
      });

      // Step 3: Set provider config
      await updateConfig.mutateAsync({
        projectId: project.id,
        providerConfig: {
          provider,
          baseUrl,
          defaultModel: provider === "openai" ? "gpt-4o-mini" : undefined,
          apiKeyEncrypted: apiKey,
        },
      });

      toast.success("Setup complete! Redirecting to your dashboard...");
      setTimeout(() => setLocation("/dashboard"), 800);
    } catch (err: any) {
      toast.error(err.message ?? "Setup failed. Please try again.");
    }
  };

  const isLoading = createOrg.isPending || createProject.isPending || updateConfig.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-lg px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png" alt="Prysm AI" className="w-8 h-8" />
          <span className="text-lg font-semibold tracking-tight">
            Prysm<span className="text-primary">AI</span>
          </span>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Organization */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">
                Welcome, {user?.name?.split(" ")[0] ?? "there"}
              </h1>
              <p className="text-muted-foreground text-sm">
                Let's set up your organization. This is the workspace where your team's projects live.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                placeholder="e.g. Acme AI Labs"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="bg-card border-border"
              />
            </div>
            <Button
              className="w-full"
              disabled={!orgName.trim()}
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Project */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">
                Create your first project
              </h1>
              <p className="text-muted-foreground text-sm">
                A project maps to one AI agent or application. You can add more later.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">Project name</Label>
              <Input
                id="projectName"
                placeholder="e.g. Customer Support Agent"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-card border-border"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!projectName.trim()}
                onClick={() => setStep(3)}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Provider config */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">
                Connect your LLM provider
              </h1>
              <p className="text-muted-foreground text-sm">
                Prysm sits between your app and your provider. We need your upstream API key to forward requests.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  setProvider(v);
                  const p = PROVIDERS.find((p) => p.value === v);
                  if (p) setBaseUrl(p.baseUrl);
                }}
              >
                <SelectTrigger className="bg-card border-border">
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

            {provider === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://your-provider.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-card border-border pr-10"
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
                Your key is stored encrypted and only used to forward requests to your provider.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!apiKey.trim() || isLoading}
                onClick={handleComplete}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Launch Dashboard <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
