/**
 * ApiKeysSection — Platform API keys management inside dark Settings Modal.
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

  const inputCls = "w-full px-3 py-2 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-blue-500/40";
  const inputStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.85)",
  };

  return (
    <div className="space-y-3">
      {/* Description + Add button */}
      <div className="flex items-center justify-between">
        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          Store your platform API keys securely for advanced integrations.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.12)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
        >
          <Plus className="w-3.5 h-3.5" /> Add Key
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputCls} style={inputStyle}>
                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Key Name</label>
              <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g., Production" className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key here..." className={inputCls} style={inputStyle} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => upsertMutation.mutate({ platform, keyName, apiKey })}
              disabled={upsertMutation.isPending || !apiKey.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#e62020", color: "#fff" }}
            >
              <Save className="w-3.5 h-3.5" /> {upsertMutation.isPending ? "Saving..." : "Save Key"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-6">
          <Key className="w-7 h-7 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.15)" }} />
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>No API keys added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3">
                <PlatformIcon platform={k.platform} className="w-4 h-4 opacity-50" />
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{k.platform} — {k.key_name}</p>
                  <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{k.masked_key}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMutation.mutate({ id: k.id, isActive: !k.is_active })}
                  className="text-[11px] px-2 py-1 rounded-lg transition-colors"
                  style={{
                    backgroundColor: k.is_active ? "rgba(230,32,32,0.12)" : "rgba(255,255,255,0.06)",
                    color: k.is_active ? "#e62020" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {k.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: k.id })}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239,68,68,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
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
