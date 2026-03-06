/**
 * reports/components/BrandingPanel.tsx — White-label branding configuration panel.
 */
import { useState } from "react";
import { Palette, ChevronDown, ChevronUp } from "lucide-react";
import { type BrandingOptions } from "./types";

export function BrandingPanel({ branding, onChange }: { branding: BrandingOptions; onChange: (b: BrandingOptions) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}33, ${branding.accentColor}33)` }}>
            <Palette className="w-4 h-4" style={{ color: branding.primaryColor }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">White-Label Branding</p>
            <p className="text-xs text-muted-foreground">{branding.companyName || "Customize report appearance for clients"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-full border-2 border-background shadow-sm" style={{ background: branding.primaryColor }} />
            <div className="w-4 h-4 rounded-full border-2 border-background shadow-sm" style={{ background: branding.accentColor }} />
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Company Name</label>
            <input value={branding.companyName} onChange={e => onChange({ ...branding, companyName: e.target.value })} placeholder="Your Company" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prepared By</label>
            <input value={branding.preparedBy} onChange={e => onChange({ ...branding, preparedBy: e.target.value })} placeholder="Marketing Team" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={branding.primaryColor} onChange={e => onChange({ ...branding, primaryColor: e.target.value })} className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
              <input value={branding.primaryColor} onChange={e => onChange({ ...branding, primaryColor: e.target.value })} placeholder="#6366f1" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Accent Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={branding.accentColor} onChange={e => onChange({ ...branding, accentColor: e.target.value })} className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
              <input value={branding.accentColor} onChange={e => onChange({ ...branding, accentColor: e.target.value })} placeholder="#8b5cf6" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Logo URL <span className="opacity-60">(optional)</span></label>
            <input value={branding.logoUrl} onChange={e => onChange({ ...branding, logoUrl: e.target.value })} placeholder="https://yourcompany.com/logo.png" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Footer Text</label>
            <input value={branding.footerText} onChange={e => onChange({ ...branding, footerText: e.target.value })} placeholder="Your Company — Confidential" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="sm:col-span-2 rounded-xl overflow-hidden border border-border">
            <div className="h-10 flex items-center px-4 gap-3" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor})` }}>
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="logo" className="h-6 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <span className="text-white font-bold text-sm">{branding.companyName || "Your Company"}</span>
              )}
              <span className="text-white/70 text-xs ml-auto">Preview</span>
            </div>
            <div className="bg-white px-4 py-2 text-xs text-gray-400 border-t">{branding.footerText || "Your Company — Analytics Report"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
