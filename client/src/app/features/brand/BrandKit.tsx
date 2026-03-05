// client/src/features/brand/BrandKit.tsx
import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import {
  Palette, Type, Image as ImageIcon, Globe, Sparkles,
  Plus, Trash2, Upload, Copy, Check, Eye, Download,
  Paintbrush, AlignLeft, Tag
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#6366F1",
  "#1E293B", "#334155", "#64748B", "#94A3B8", "#F8FAFC",
];

const FONT_OPTIONS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Poppins", "Nunito", "Raleway", "Playfair Display", "Merriweather",
  "Source Sans Pro", "DM Sans", "Plus Jakarta Sans", "Outfit", "Figtree",
];

const TONE_OPTIONS = [
  "Professional", "Friendly", "Casual", "Authoritative", "Playful",
  "Inspirational", "Educational", "Conversational", "Bold", "Minimalist",
];

// ─── Color Swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({ color, onRemove, canAdmin }: { color: string; onRemove: () => void; canAdmin: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group relative flex flex-col items-center gap-1.5">
      <div
        className="w-14 h-14 rounded-xl shadow-md cursor-pointer border-2 border-white/20 hover:scale-105 transition-transform"
        style={{ backgroundColor: color }}
        onClick={copy}
        title="Click to copy"
      />
      <span className="text-[10px] font-mono text-muted-foreground">{color.toUpperCase()}</span>
      <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={copy} className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-accent">
          {copied ? <Check className="w-2.5 h-2.5 text-green-500" /> : <Copy className="w-2.5 h-2.5" />}
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

// ─── Brand Preview Card ───────────────────────────────────────────────────────
function BrandPreviewCard({ brandName, brandDesc, colors, fonts, logoUrl }: {
  brandName: string; brandDesc: string; colors: string[]; fonts: string[]; logoUrl?: string;
}) {
  const primaryColor = colors[0] ?? "#3B82F6";
  const secondaryColor = colors[1] ?? "#8B5CF6";
  const primaryFont = fonts[0] ?? "Inter";

  return (
    <div className="glass rounded-2xl overflow-hidden border border-border/40">
      {/* Header */}
      <div
        className="p-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}15)` }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        />
        <div className="relative flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white/10 p-1" />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              {brandName?.[0]?.toUpperCase() ?? "B"}
            </div>
          )}
          <div>
            <h3
              className="font-bold text-lg leading-tight"
              style={{ fontFamily: primaryFont, color: primaryColor }}
            >
              {brandName || "Your Brand"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{brandDesc || "Brand tagline goes here"}</p>
          </div>
        </div>
      </div>

      {/* Color palette strip */}
      {colors.length > 0 && (
        <div className="flex h-2">
          {colors.slice(0, 6).map((c, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: c }} />
          ))}
        </div>
      )}

      {/* Sample content */}
      <div className="p-5 space-y-3">
        <div
          className="text-sm font-semibold"
          style={{ fontFamily: primaryFont, color: primaryColor }}
        >
          Sample Post Headline
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: primaryFont }}>
          This is how your brand content will look with the selected typography and color palette applied consistently across all platforms.
        </p>
        <button
          className="text-xs px-4 py-1.5 rounded-lg text-white font-medium"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          Call to Action
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BrandKit() {
  usePageTitle("Brand Kit");
  const { activeWorkspace, canAdmin } = useWorkspace();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"colors" | "fonts" | "voice" | "preview">("colors");
  const [customColor, setCustomColor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch brand profile
  const { data: profile, isLoading } = trpc.workspaces.getBrandProfile.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

  // Local state
  const [colors, setColors] = useState<string[]>([]);
  const [fonts, setFonts] = useState<string[]>([]);
  const [tone, setTone] = useState("Professional");
  const [brandName, setBrandName] = useState("");
  const [brandDesc, setBrandDesc] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");

  // Sync from profile
  const [synced, setSynced] = useState(false);
  if (profile && !synced) {
    setColors(profile.brand_colors ?? []);
    setFonts(profile.brand_fonts ?? []);
    setTone(profile.tone ?? "Professional");
    setBrandName(profile.brand_name ?? "");
    setBrandDesc(profile.brand_desc ?? "");
    setWebsiteUrl(profile.website_url ?? "");
    setKeywords(profile.keywords ?? []);
    setSynced(true);
  }

  const upsertMutation = trpc.workspaces.upsertBrandProfile.useMutation({
    onSuccess: () => {
      toast.success("Brand Kit saved successfully");
      utils.workspaces.getBrandProfile.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const uploadLogoMutation = trpc.workspaces.uploadLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo uploaded successfully");
      utils.workspaces.get.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const handleSave = async () => {
    if (!activeWorkspace) return;
    setSaving(true);
    await upsertMutation.mutateAsync({
      workspaceId: activeWorkspace.id,
      brandColors: colors,
      brandFonts: fonts,
      tone,
      brandName: brandName || undefined,
      brandDesc: brandDesc || undefined,
      websiteUrl: websiteUrl || undefined,
      keywords,
    });
    setSaving(false);
  };

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev: ProgressEvent<FileReader>) => {
      const dataUrl = ev.target?.result as string;
      await uploadLogoMutation.mutateAsync({
        workspaceId: activeWorkspace.id,
        dataUrl,
        mimeType: file.type,
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }, [activeWorkspace, uploadLogoMutation]);

  const addColor = (c: string) => {
    if (!colors.includes(c) && colors.length < 10) {
      setColors([...colors, c]);
    }
  };

  const removeColor = (c: string) => setColors(colors.filter(x => x !== c));

  const toggleFont = (f: string) => {
    if (fonts.includes(f)) {
      setFonts(fonts.filter(x => x !== f));
    } else if (fonts.length < 5) {
      setFonts([...fonts, f]);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  if (!activeWorkspace) return null;

  const tabs = [
    { id: "colors" as const, label: "Colors", icon: Palette },
    { id: "fonts" as const, label: "Typography", icon: Type },
    { id: "voice" as const, label: "Brand Voice", icon: AlignLeft },
    { id: "preview" as const, label: "Preview", icon: Eye },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Paintbrush className="w-6 h-6 text-brand" />
              Brand Kit
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define your brand identity to ensure consistent AI-generated content
            </p>
          </div>
          {canAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand/90 disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</>
              ) : (
                <><Check className="w-3.5 h-3.5" />Save Brand Kit</>
              )}
            </button>
          )}
        </div>

        {/* Logo + Identity Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Logo Upload */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-semibold">Logo</h3>
            </div>
            <div className="flex flex-col items-center gap-3">
              {activeWorkspace.logo_url ? (
                <img
                  src={activeWorkspace.logo_url}
                  alt="Logo"
                  className="w-20 h-20 rounded-xl object-contain bg-muted/30 p-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted/30 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              {canAdmin && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full px-3 py-2 rounded-xl border border-border/60 text-xs font-medium hover:bg-accent transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {uploading ? (
                      <><span className="w-3 h-3 border-2 border-border border-t-foreground rounded-full animate-spin" />Uploading...</>
                    ) : (
                      <><Upload className="w-3 h-3" />Upload Logo</>
                    )}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center">PNG, JPG, SVG up to 2MB</p>
                </>
              )}
            </div>
          </div>

          {/* Brand Identity */}
          <div className="glass rounded-2xl p-5 space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-semibold">Brand Identity</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Brand Name</label>
                <input
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  disabled={!canAdmin}
                  placeholder="e.g. DashFields"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Website URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    disabled={!canAdmin}
                    placeholder="https://yoursite.com"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Brand Description</label>
              <textarea
                value={brandDesc}
                onChange={e => setBrandDesc(e.target.value)}
                disabled={!canAdmin}
                placeholder="Briefly describe your brand, mission, and target audience..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex border-b border-border/40">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-brand border-b-2 border-brand bg-brand/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Colors Tab */}
            {activeTab === "colors" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Brand Color Palette</h3>
                  <p className="text-xs text-muted-foreground">Select up to 10 colors that represent your brand</p>
                </div>

                {/* Current palette */}
                {colors.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {colors.map(c => (
                      <ColorSwatch key={c} color={c} onRemove={() => removeColor(c)} canAdmin={canAdmin} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/60 rounded-xl">
                    No colors added yet. Pick from presets or enter a custom color below.
                  </div>
                )}

                {canAdmin && (
                  <>
                    {/* Preset colors */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Preset Colors</p>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => addColor(c)}
                            disabled={colors.includes(c) || colors.length >= 10}
                            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                              colors.includes(c) ? "border-brand ring-2 ring-brand/30" : "border-white/20"
                            } disabled:opacity-40`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Custom color */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-border/40">
                        <input
                          type="color"
                          value={customColor}
                          onChange={e => setCustomColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-sm font-mono text-muted-foreground">{customColor.toUpperCase()}</span>
                      </div>
                      <button
                        onClick={() => addColor(customColor)}
                        disabled={colors.includes(customColor) || colors.length >= 10}
                        className="px-4 py-2 rounded-xl bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Custom Color
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Fonts Tab */}
            {activeTab === "fonts" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Brand Typography</h3>
                  <p className="text-xs text-muted-foreground">Select up to 5 fonts for your brand (first font = primary)</p>
                </div>

                {/* Selected fonts */}
                {fonts.length > 0 && (
                  <div className="space-y-2">
                    {fonts.map((f, i) => (
                      <div key={f} className="flex items-center justify-between glass rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16">{i === 0 ? "Primary" : i === 1 ? "Secondary" : `Font ${i + 1}`}</span>
                          <span className="text-base font-medium" style={{ fontFamily: f }}>{f}</span>
                          <span className="text-xs text-muted-foreground" style={{ fontFamily: f }}>Aa Bb Cc 123</span>
                        </div>
                        {canAdmin && (
                          <button onClick={() => toggleFont(f)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canAdmin && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FONT_OPTIONS.map(f => (
                      <button
                        key={f}
                        onClick={() => toggleFont(f)}
                        disabled={!fonts.includes(f) && fonts.length >= 5}
                        className={`px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${
                          fonts.includes(f)
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border/60 hover:border-brand/40 hover:bg-brand/5 disabled:opacity-40"
                        }`}
                        style={{ fontFamily: f }}
                      >
                        <span className="font-medium">{f}</span>
                        <span className="block text-xs opacity-60 mt-0.5">Aa Bb 123</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Brand Voice Tab */}
            {activeTab === "voice" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Brand Voice & Tone</h3>
                  <p className="text-xs text-muted-foreground">Define how your brand communicates to guide AI content generation</p>
                </div>

                {/* Tone selector */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Primary Tone</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {TONE_OPTIONS.map(t => (
                      <button
                        key={t}
                        onClick={() => canAdmin && setTone(t)}
                        disabled={!canAdmin}
                        className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          tone === t
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border/60 hover:border-brand/40 hover:bg-brand/5 disabled:opacity-60"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Brand Keywords</label>
                  <p className="text-[11px] text-muted-foreground">Words the AI should use frequently in your content</p>
                  <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {keywords.map(k => (
                      <span key={k} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-medium">
                        {k}
                        {canAdmin && (
                          <button onClick={() => setKeywords(keywords.filter(x => x !== k))} className="hover:text-destructive">
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {canAdmin && (
                    <div className="flex gap-2">
                      <input
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addKeyword()}
                        placeholder="Add keyword..."
                        className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                      />
                      <button
                        onClick={addKeyword}
                        className="px-4 py-2 rounded-xl bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Brand Preview</h3>
                  <p className="text-xs text-muted-foreground">See how your brand identity looks in practice</p>
                </div>
                <div className="max-w-sm">
                  <BrandPreviewCard
                    brandName={brandName}
                    brandDesc={brandDesc}
                    colors={colors}
                    fonts={fonts}
                    logoUrl={activeWorkspace.logo_url ?? undefined}
                  />
                </div>
                <div className="glass rounded-xl p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Brand Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{brandName || "—"}</span></div>
                    <div><span className="text-muted-foreground">Tone:</span> <span className="font-medium">{tone}</span></div>
                    <div><span className="text-muted-foreground">Colors:</span> <span className="font-medium">{colors.length} defined</span></div>
                    <div><span className="text-muted-foreground">Fonts:</span> <span className="font-medium">{fonts.length > 0 ? fonts[0] : "—"}</span></div>
                    <div><span className="text-muted-foreground">Keywords:</span> <span className="font-medium">{keywords.length} defined</span></div>
                    <div><span className="text-muted-foreground">Website:</span> <span className="font-medium truncate">{websiteUrl || "—"}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Integration Note */}
        <div className="glass rounded-xl p-4 flex items-start gap-3 border border-brand/20">
          <Sparkles className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-brand">AI-Powered Content Generation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your Brand Kit is automatically used by the AI Content Studio to generate posts, captions, and campaigns that match your brand voice, colors, and style guidelines.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
