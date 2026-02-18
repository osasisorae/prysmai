import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Terminal } from "lucide-react";
import { toast } from "sonner";

export default function ApiKeys({ projectId }: { projectId: number }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const utils = trpc.useUtils();
  const keys = trpc.apiKey.list.useQuery({ projectId });
  const createKey = trpc.apiKey.create.useMutation({
    onSuccess: (data) => {
      setNewKeyValue(data.key);
      utils.apiKey.list.invalidate({ projectId });
    },
  });
  const revokeKey = trpc.apiKey.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked.");
      utils.apiKey.list.invalidate({ projectId });
      setRevokeId(null);
    },
  });

  const handleCreate = async () => {
    await createKey.mutateAsync({
      projectId,
      name: newKeyName.trim() || undefined,
    });
    setNewKeyName("");
  };

  const copyKey = () => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Use these keys to authenticate requests to the Prysm proxy
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); setNewKeyValue(null); setCopied(false); }}>
          <Plus className="w-4 h-4 mr-2" /> Create Key
        </Button>
      </div>

      {/* Integration guide — Python SDK */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Quick Start — Python SDK
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const code = `pip install prysmai\n\nfrom prysmai import PrysmClient\n\n# Your Prysm key handles everything — OpenAI credentials are already\n# linked from your project setup. No OpenAI key needed.\nclient = PrysmClient(prysm_key="sk-prysm-...").openai()\n\nresponse = client.chat.completions.create(\n    model="gpt-4o-mini",\n    messages=[{"role": "user", "content": "Hello!"}]\n)\nprint(response.choices[0].message.content)`;
                navigator.clipboard.writeText(code);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 1500);
              }}
            >
              {codeCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {codeCopied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-lg border border-border p-4 font-mono text-sm leading-relaxed overflow-x-auto">
            <p className="text-muted-foreground"># 1. Install the SDK</p>
            <p><span className="text-primary">pip install</span> prysmai</p>
            <p className="mt-3 text-muted-foreground"># 2. Create a client with your Prysm key</p>
            <p><span className="text-blue-400">from</span> prysmai <span className="text-blue-400">import</span> PrysmClient</p>
            <p className="mt-2">client = PrysmClient(prysm_key=<span className="text-green-400">"sk-prysm-..."</span>).openai()</p>
            <p className="mt-1 text-muted-foreground text-xs"># Your OpenAI credentials are already linked from project setup</p>
            <p className="mt-3 text-muted-foreground"># 3. Use like any OpenAI client — Prysm captures everything</p>
            <p>response = client.chat.completions.<span className="text-primary">create</span>(</p>
            <p className="ml-4">model=<span className="text-green-400">"gpt-4o-mini"</span>,</p>
             <p className="ml-4">messages=[{"{"}"role": "user", "content": "Hello!"{"}"}]</p>
            <p>)</p>
            <p><span className="text-primary">print</span>(response.choices[0].message.content)</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Full documentation at{" "}
            <a href="/docs" className="text-primary hover:underline">prysmai.io/docs</a>
            {" · "}
            <a href="https://pypi.org/project/prysmai/" target="_blank" rel="noopener" className="text-primary hover:underline">PyPI</a>
            {" · "}
            <a href="https://github.com/osasisorae/prysmai-python" target="_blank" rel="noopener" className="text-primary hover:underline">GitHub</a>
          </p>
        </CardContent>
      </Card>

      {/* Keys list */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {keys.isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : keys.data && keys.data.length > 0 ? (
            <div>
              {/* Header */}
              <div className="grid grid-cols-[1fr_200px_160px_80px] gap-2 py-2.5 px-4 text-xs text-muted-foreground border-b border-border font-medium">
                <span>Name / Key</span>
                <span>Created</span>
                <span>Last Used</span>
                <span className="text-right">Actions</span>
              </div>
              {keys.data.map((key: any) => (
                <div
                  key={key.id}
                  className={`grid grid-cols-[1fr_200px_160px_80px] gap-2 py-3 px-4 text-sm border-b border-border/50 last:border-0 items-center ${
                    key.revokedAt ? "opacity-50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{key.name || "Unnamed key"}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">{key.keyPrefix}...</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                  </span>
                  <div className="text-right">
                    {key.revokedAt ? (
                      <span className="text-xs text-destructive">Revoked</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => setRevokeId(key.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No API keys yet</p>
              <p className="text-xs mt-1">Create your first key to start sending requests through the proxy</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setNewKeyValue(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{newKeyValue ? "Key Created" : "Create API Key"}</DialogTitle>
          </DialogHeader>
          {newKeyValue ? (
            <div className="space-y-4">
              <div className="bg-background rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-2">Copy this key now — you won't see it again.</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono flex-1 break-all">{newKeyValue}</code>
                  <Button variant="outline" size="sm" onClick={copyKey}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>This key will only be shown once. Store it securely.</span>
              </div>
              <DialogFooter>
                <Button onClick={() => { setShowCreate(false); setNewKeyValue(null); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key name (optional)</Label>
                <Input
                  id="keyName"
                  placeholder="e.g. Production, Staging"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createKey.isPending}>
                  {createKey.isPending ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeId !== null} onOpenChange={(open) => !open && setRevokeId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. Any requests using this key will be rejected immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => revokeId && revokeKey.mutate({ keyId: revokeId, projectId })}
              disabled={revokeKey.isPending}
            >
              {revokeKey.isPending ? "Revoking..." : "Revoke Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
