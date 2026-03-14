/**
 * ai/tabs/AdToolsTab.tsx — AI-powered ad copy, audience, creative brief, and strategy tools.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Sparkles, Copy, RefreshCw, CheckCircle2, Zap,
} from "lucide-react";
import { AD_TOOLS } from "./constants";

export function AdToolsTab() {
  const [activeTool, setActiveTool] = useState("copy");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.ai.generate.useMutation({
    onSuccess: (data) => setResult(typeof data.content === "string" ? data.content : ""),
    onError: (err) => toast.error("Generation failed: " + err.message),
  });

  const currentTool = AD_TOOLS.find(t => t.id === activeTool)!;

  const handleGenerate = () => {
    if (!prompt.trim()) { toast.error("Please enter a prompt"); return; }
    const toolMap: Record<string, "copy" | "audience" | "creative" | "strategy" | "hashtags" | "caption"> = {
      copy: "copy", audience: "audience", creative: "creative", strategy: "strategy",
    };
    generateMutation.mutate({ tool: toolMap[activeTool] ?? "copy", prompt });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Tool Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AD_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { setActiveTool(tool.id); setPrompt(""); setResult(""); }}
            className={"bg-card border rounded-2xl p-4 text-left transition-all " + (activeTool === tool.id ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50")}
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <tool.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{tool.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{tool.desc}</p>
          </button>
        ))}
      </div>
      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <currentTool.icon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{currentTool.label}</h2>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you need..."
            rows={6}
            className="w-full resize-none bg-muted/50 rounded-xl p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick examples:</p>
            <div className="space-y-1.5">
              {currentTool.examples.slice(0, 2).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg px-3 py-2 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-brand to-red-700 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {generateMutation.isPending
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>
              : <><Zap className="w-4 h-4" />Generate</>
            }
          </button>
        </div>
        {/* Output */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-semibold text-foreground">Result</h2>
            </div>
            {result && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-foreground" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
          <div className="min-h-[200px] bg-muted/50 rounded-xl p-3 overflow-y-auto max-h-[400px]">
            {generateMutation.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating your content...
              </div>
            ) : result ? (
              <Streamdown className="text-sm leading-relaxed">{result}</Streamdown>
            ) : (
              <p className="text-sm text-muted-foreground">Your generated content will appear here...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
