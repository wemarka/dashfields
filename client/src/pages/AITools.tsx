import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Sparkles, Send, Copy, RefreshCw, Wand2, Target, FileText, Image } from "lucide-react";
const tools = [
  { id: "copy",     icon: FileText, label: "Ad Copywriter",       desc: "Generate compelling ad headlines and descriptions" },
  { id: "audience", icon: Target,   label: "Audience Builder",    desc: "Define and refine your target audience" },
  { id: "creative", icon: Image,    label: "Creative Brief",      desc: "Create briefs for your design team" },
  { id: "strategy", icon: Wand2,    label: "Campaign Strategist", desc: "Get AI-powered campaign strategy recommendations" },
];

const examples = [
  "Write 5 Facebook ad headlines for a summer clothing sale targeting women 25-45",
  "Create a retargeting ad for cart abandoners with a 10% discount offer",
  "Generate a campaign strategy for launching a new fitness app",
  "Write Instagram ad copy for a luxury watch brand",
];

export default function AITools() {
  const [activeTool, setActiveTool] = useState("copy");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult("");
    // Placeholder: AI generation will be wired to backend
    setTimeout(() => {
      setResult("[AI generation coming soon — connect to the AI router in server/routers.ts]");
      setLoading(false);
    }, 1200);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Tools</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Supercharge your campaigns with AI assistance</p>
        </div>

        {/* Tool Selector */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={"glass rounded-2xl p-4 text-left transition-all " + (activeTool === tool.id ? "ring-2 ring-foreground/20 bg-foreground/5" : "hover:bg-foreground/3")}
            >
              <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center mb-3">
                <tool.icon className="w-4 h-4 text-foreground/60" />
              </div>
              <p className="text-sm font-medium">{tool.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{tool.desc}</p>
            </button>
          ))}
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-foreground/60" />
              <h2 className="text-sm font-semibold">Prompt</h2>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you need..."
              rows={6}
              className="w-full resize-none bg-foreground/3 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-foreground/15 placeholder:text-muted-foreground"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Examples:</p>
              <div className="space-y-1.5">
                {examples.slice(0, 2).map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-foreground/3 hover:bg-foreground/6 rounded-lg px-3 py-2 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          {/* Output */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-foreground/60" />
                <h2 className="text-sm font-semibold">Result</h2>
              </div>
              {result && (
                <button
                  onClick={() => navigator.clipboard.writeText(result)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              )}
            </div>
            <div className="min-h-[200px] bg-foreground/3 rounded-xl p-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating your content...
                </div>
              ) : result ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Your generated content will appear here...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
