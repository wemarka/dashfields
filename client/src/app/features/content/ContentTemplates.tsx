/**
 * ContentTemplates.tsx
 * DashFields — Content Templates Library
 * Create, manage, and reuse caption templates across platforms.
 */
import { useState } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  FileText, Plus, Trash2, Edit3, Copy, Hash, Search,
  Filter, Star, TrendingUp, Instagram, Facebook, Linkedin,
  Twitter, Youtube, Globe, Sparkles,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Badge } from "@/core/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { Textarea } from "@/core/components/ui/textarea";
import { Label } from "@/core/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TemplateRow {
  id: number;
  name: string;
  category: string;
  platform: string;
  caption: string;
  hashtags: string[];
  tone: string;
  is_public: boolean;
  usage_count: number;
  tags: string[];
  created_at: string;
}

const CATEGORIES = [
  { value: "promotional",   label: "Promotional",    emoji: "🎯" },
  { value: "educational",   label: "Educational",    emoji: "📚" },
  { value: "engagement",    label: "Engagement",     emoji: "💬" },
  { value: "announcement",  label: "Announcement",   emoji: "📢" },
  { value: "seasonal",      label: "Seasonal",       emoji: "🎄" },
  { value: "product",       label: "Product",        emoji: "📦" },
  { value: "testimonial",   label: "Testimonial",    emoji: "⭐" },
  { value: "behind_scenes", label: "Behind Scenes",  emoji: "🎬" },
];

const PLATFORMS = ["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube"];
const TONES     = ["casual", "professional", "humorous", "inspirational", "urgent", "educational", "storytelling"];

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook:  Facebook,
  linkedin:  Linkedin,
  twitter:   Twitter,
  youtube:   Youtube,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "text-pink-500",
  facebook:  "text-blue-600",
  linkedin:  "text-blue-700",
  twitter:   "text-sky-500",
  youtube:   "text-red-600",
  tiktok:    "text-black dark:text-white",
};

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  template,
  onEdit,
  onDelete,
  onUse,
}: {
  template: TemplateRow;
  onEdit: (t: TemplateRow) => void;
  onDelete: (id: number) => void;
  onUse: (t: TemplateRow) => void;
}) {
  const PlatformIcon = PLATFORM_ICONS[template.platform] ?? Globe;
  const catInfo = CATEGORIES.find(c => c.value === template.category);

  const handleCopy = () => {
    const text = [template.caption, template.hashtags.map(h => `#${h}`).join(" ")].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!"));
    onUse(template);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{catInfo?.emoji ?? "📄"}</span>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{template.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PlatformIcon className={`w-3 h-3 ${PLATFORM_COLORS[template.platform] ?? "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground capitalize">{template.platform}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground capitalize">{template.tone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {template.is_public && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">Public</Badge>
          )}
          <button onClick={() => onEdit(template)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(template.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Caption Preview */}
      <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-3 leading-relaxed">
        {template.caption}
      </p>

      {/* Hashtags */}
      {template.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.hashtags.slice(0, 4).map(h => (
            <span key={h} className="text-xs text-primary/70 flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" />{h}
            </span>
          ))}
          {template.hashtags.length > 4 && (
            <span className="text-xs text-muted-foreground">+{template.hashtags.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          {template.usage_count} uses
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 text-xs gap-1">
          <Copy className="w-3 h-3" />
          Copy & Use
        </Button>
      </div>
    </div>
  );
}

// ─── Template Form Modal ──────────────────────────────────────────────────────
function TemplateFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: TemplateRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name,     setName]     = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "promotional");
  const [platform, setPlatform] = useState(initial?.platform ?? "instagram");
  const [caption,  setCaption]  = useState(initial?.caption ?? "");
  const [hashtags, setHashtags] = useState(initial?.hashtags?.join(", ") ?? "");
  const [tone,     setTone]     = useState(initial?.tone ?? "casual");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);
  const [tags,     setTags]     = useState(initial?.tags?.join(", ") ?? "");

  const createMutation = trpc.contentTemplates.create.useMutation({ onSuccess: onSaved, onError: e => toast.error(e.message) });
  const updateMutation = trpc.contentTemplates.update.useMutation({ onSuccess: onSaved, onError: e => toast.error(e.message) });

  const handleSave = () => {
    if (!name.trim())    { toast.error("Name is required"); return; }
    if (!caption.trim()) { toast.error("Caption is required"); return; }
    const payload = {
      name:     name.trim(),
      category: category as "promotional",
      platform,
      caption:  caption.trim(),
      hashtags: hashtags.split(",").map(h => h.trim().replace(/^#/, "")).filter(Boolean),
      tone,
      isPublic,
      tags:     tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    if (initial) {
      updateMutation.mutate({ id: initial.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Template" : "Create Content Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Template Name *</Label>
            <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Product Launch Announcement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Caption *</Label>
            <Textarea
              value={caption}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
              rows={5}
              placeholder="Write your caption template here. Use [BRAND], [PRODUCT], [LINK] as placeholders..."
            />
            <p className="text-xs text-muted-foreground">{caption.length} characters</p>
          </div>
          <div className="space-y-1.5">
            <Label>Hashtags (comma-separated, without #)</Label>
            <Input value={hashtags} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHashtags(e.target.value)} placeholder="marketing, socialmedia, brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={isPublic ? "public" : "private"} onValueChange={v => setIsPublic(v === "public")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">🔒 Private</SelectItem>
                  <SelectItem value="public">🌐 Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)} placeholder="launch, sale, event" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : initial ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContentTemplates() {
  usePageTitle("Content Templates");
  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("all");
  const [filterPlat,  setFilterPlat]  = useState("all");
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<TemplateRow | null>(null);

  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.contentTemplates.list.useQuery({
    category:      filterCat  !== "all" ? filterCat as "promotional" : undefined,
    platform:      filterPlat !== "all" ? filterPlat : undefined,
    includePublic: false,
  });

  const deleteMutation = trpc.contentTemplates.delete.useMutation({
    onSuccess: () => { toast.success("Template deleted"); utils.contentTemplates.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const useMutation = trpc.contentTemplates.use.useMutation({
    onSuccess: () => utils.contentTemplates.list.invalidate(),
  });

  const handleSaved = () => {
    toast.success(editTarget ? "Template updated!" : "Template created!");
    setShowModal(false);
    setEditTarget(null);
    utils.contentTemplates.list.invalidate();
  };

  const filtered = (templates as TemplateRow[]).filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.caption.toLowerCase().includes(search.toLowerCase())
  );

  const totalUses = (templates as TemplateRow[]).reduce((s, t) => s + t.usage_count, 0);
  const topTemplate = (templates as TemplateRow[]).sort((a, b) => b.usage_count - a.usage_count)[0];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Content Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable caption templates to speed up your content creation
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{templates.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Templates</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">{totalUses}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Uses</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground truncate">{topTemplate?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            Most Used
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-40">
            <Globe className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map(p => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilterCat(c.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filterCat === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="font-semibold text-foreground mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create reusable caption templates to speed up your content workflow
          </p>
          <Button onClick={() => { setEditTarget(null); setShowModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Create First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={tpl => { setEditTarget(tpl); setShowModal(true); }}
              onDelete={id => {
                if (!confirm("Delete this template?")) return;
                deleteMutation.mutate({ id });
              }}
              onUse={tpl => useMutation.mutate({ id: tpl.id })}
            />
          ))}
        </div>
      )}

      {showModal && (
        <TemplateFormModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
