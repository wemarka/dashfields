/**
 * brand/components/BrandSubComponents.tsx — ColorSwatch and BrandPreviewCard.
 */
import { useState } from "react";
import { Trash2, Copy, Check } from "lucide-react";

/* ─── Color Swatch ─────────────────────────────────────────────────────────── */
export function ColorSwatch({ color, onRemove, canAdmin }: { color: string; onRemove: () => void; canAdmin: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(color); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="group relative flex flex-col items-center gap-1.5">
      <div className="w-14 h-14 rounded-xl shadow-md cursor-pointer border-2 border-white/20 hover:scale-105 transition-transform" style={{ backgroundColor: color }} onClick={copy} title="Click to copy" />
      <span className="text-[10px] font-mono text-muted-foreground">{color.toUpperCase()}</span>
      <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={copy} className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-accent">
          {copied ? <Check className="w-2.5 h-2.5 text-brand" /> : <Copy className="w-2.5 h-2.5" />}
        </button>
        {canAdmin && (
          <button onClick={onRemove} className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Brand Preview Card ───────────────────────────────────────────────────── */
export function BrandPreviewCard({ brandName, brandDesc, colors, fonts, logoUrl }: {
  brandName: string; brandDesc: string; colors: string[]; fonts: string[]; logoUrl?: string;
}) {
  const primaryColor = colors[0] ?? "#3B82F6";
  const secondaryColor = colors[1] ?? "#8B5CF6";
  const primaryFont = fonts[0] ?? "Inter";

  return (
    <div className="glass rounded-2xl overflow-hidden border border-border/40">
      <div className="p-6 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}15)` }}>
        <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
        <div className="relative flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-neutral-900/10 p-1" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
              {brandName?.[0]?.toUpperCase() ?? "B"}
            </div>
          )}
          <div>
            <h3 className="font-bold text-lg leading-tight" style={{ fontFamily: primaryFont, color: primaryColor }}>{brandName || "Your Brand"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{brandDesc || "Brand tagline goes here"}</p>
          </div>
        </div>
      </div>
      {colors.length > 0 && (
        <div className="flex h-2">{colors.slice(0, 6).map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}</div>
      )}
      <div className="p-5 space-y-3">
        <div className="text-sm font-semibold" style={{ fontFamily: primaryFont, color: primaryColor }}>Sample Post Headline</div>
        <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: primaryFont }}>
          This is how your brand content will look with the selected typography and color palette applied consistently across all platforms.
        </p>
        <button className="text-xs px-4 py-1.5 rounded-lg text-white font-medium" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
          Call to Action
        </button>
      </div>
    </div>
  );
}
