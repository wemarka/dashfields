/**
 * DashStudiosPage — Creative image/video generation playground.
 * Placeholder — will be expanded with full AI generation tools.
 */
import { Palette, ImagePlus, Video, Wand2 } from "lucide-react";
import { toast } from "sonner";

export default function DashStudiosPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dash Studios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create stunning ad creatives with AI-powered generation tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: ImagePlus, title: "Image Generator", desc: "Generate ad images with AI", color: "from-violet-500/20 to-indigo-500/20 text-violet-400" },
          { icon: Video, title: "Video Creator", desc: "Create short-form video ads", color: "from-pink-500/20 to-rose-500/20 text-pink-400" },
          { icon: Wand2, title: "Brand Kit Studio", desc: "Generate brand-consistent assets", color: "from-amber-500/20 to-orange-500/20 text-amber-400" },
        ].map((tool) => (
          <button
            key={tool.title}
            onClick={() => toast.info("Feature coming soon")}
            className="group p-6 rounded-xl border border-white/[0.06] bg-card hover:bg-white/[0.04] transition-all duration-200 text-left card-hover"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}>
              <tool.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{tool.title}</h3>
            <p className="text-xs text-muted-foreground">{tool.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
