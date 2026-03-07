/**
 * settings/components/ApiKeysSection.tsx — Platform API keys management.
 * Flat design: no card wrapper. Title rendered by parent (Settings.tsx).
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { Key, Plus, Save, Trash2 } from "lucide-react";
import { PLATFORMS } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";

export function ApiKeysSection() {
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState("facebook");
  const [keyName, setKeyName] = useState("Default");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const utils = trpc.useUtils();

  const { data: keys = [], isLoading } = trpc.apiKeys.list.useQuery();
  const upsertMutation = trpc.apiKeys.upsert.useMutation({
    onSuccess: () => { toast.success("API key saved!"); setShowForm(false); setApiKey(""); utils.apiKeys.list.invalidate(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });
  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.apiKeys.list.invalidate(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });
  const toggleMutation = trpc.apiKeys.toggle.useMutation({
    onSuccess: () => utils.apiKeys.list.invalidate(),
    onError: (e) => toast.error("Failed: " + e.message),
  });

  return (
    <div className="space-y-4">
      {/* Description + Add button row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Store your platform API keys securely for advanced integrations.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Key
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Key Name</label>
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production, Test"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => upsertMutation.mutate({ platform, keyName, apiKey })}
              disabled={upsertMutation.isPending || !apiKey.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {upsertMutation.isPending ? "Saving..." : "Save Key"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8">
          <Key className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No API keys added yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add platform API keys to enable advanced integrations</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={k.platform} className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{k.platform} — {k.key_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{k.masked_key}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleMutation.mutate({ id: k.id, isActive: !k.is_active })}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${k.is_active ? "text-emerald-600 bg-emerald-50" : "text-muted-foreground bg-muted"}`}
                  title={k.is_active ? "Active — click to disable" : "Inactive — click to enable"}
                >
                  {k.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: k.id })}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
