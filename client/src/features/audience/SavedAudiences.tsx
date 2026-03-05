/**
 * SavedAudiences.tsx
 * DashFields — Saved Audience Segments
 * Create, manage, and reuse audience segments across campaigns.
 */
import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  Users, Plus, Trash2, Edit3, Tag, Globe, ChevronDown, ChevronUp,
  Instagram, Facebook, Linkedin, Twitter, Youtube,
  Search, Filter, BookmarkCheck,
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
interface AudienceRow {
  id: number;
  name: string;
  description: string | null;
  platforms: string[];
  age_min: number | null;
  age_max: number | null;
  genders: string[];
  locations: string[];
  interests: string[];
  behaviors: string[];
  languages: string[];
  estimated_size: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ─── Platform Icons ───────────────────────────────────────────────────────────
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
};

const ALL_PLATFORMS = ["instagram", "facebook", "linkedin", "twitter", "youtube", "tiktok"];
const ALL_GENDERS   = ["male", "female", "all"];
const INTERESTS_LIST = [
  "Technology", "Fashion", "Sports", "Travel", "Food", "Health", "Finance",
  "Entertainment", "Education", "Automotive", "Real Estate", "Gaming",
];

// ─── Audience Card ────────────────────────────────────────────────────────────
function AudienceCard({
  audience,
  onEdit,
  onDelete,
}: {
  audience: AudienceRow;
  onEdit: (a: AudienceRow) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{audience.name}</h3>
            {audience.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{audience.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onEdit(audience)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(audience.id)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Platforms */}
      {audience.platforms.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3">
          {audience.platforms.map(p => {
            const Icon = PLATFORM_ICONS[p] ?? Globe;
            return (
              <span key={p} title={p} className={`${PLATFORM_COLORS[p] ?? "text-muted-foreground"}`}>
                <Icon className="w-4 h-4" />
              </span>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(audience.age_min || audience.age_max) && (
          <Badge variant="secondary" className="text-xs">
            Age: {audience.age_min ?? "13"}–{audience.age_max ?? "65"}+
          </Badge>
        )}
        {audience.genders.length > 0 && audience.genders[0] !== "all" && (
          <Badge variant="secondary" className="text-xs capitalize">
            {audience.genders.join(", ")}
          </Badge>
        )}
        {audience.locations.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            {audience.locations.slice(0, 2).join(", ")}
            {audience.locations.length > 2 && ` +${audience.locations.length - 2}`}
          </Badge>
        )}
        {audience.estimated_size && (
          <Badge variant="outline" className="text-xs text-primary border-primary/30">
            ~{audience.estimated_size.toLocaleString()} people
          </Badge>
        )}
      </div>

      {/* Interests (collapsible) */}
      {audience.interests.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {audience.interests.length} interests
          </button>
          {expanded && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {audience.interests.map(i => (
                <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {audience.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
          {audience.tags.map(t => (
            <span key={t} className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="w-3 h-3" />{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Audience Form Modal ──────────────────────────────────────────────────────
function AudienceFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AudienceRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name,        setName]        = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [platforms,   setPlatforms]   = useState<string[]>(initial?.platforms ?? []);
  const [ageMin,      setAgeMin]      = useState<string>(initial?.age_min?.toString() ?? "");
  const [ageMax,      setAgeMax]      = useState<string>(initial?.age_max?.toString() ?? "");
  const [genders,     setGenders]     = useState<string[]>(initial?.genders ?? []);
  const [locations,   setLocations]   = useState(initial?.locations?.join(", ") ?? "");
  const [interests,   setInterests]   = useState<string[]>(initial?.interests ?? []);
  const [behaviors,   setBehaviors]   = useState(initial?.behaviors?.join(", ") ?? "");
  const [languages,   setLanguages]   = useState(initial?.languages?.join(", ") ?? "");
  const [estSize,     setEstSize]     = useState<string>(initial?.estimated_size?.toString() ?? "");
  const [tags,        setTags]        = useState(initial?.tags?.join(", ") ?? "");

  const createMutation = trpc.savedAudiences.create.useMutation({ onSuccess: onSaved, onError: e => toast.error(e.message) });
  const updateMutation = trpc.savedAudiences.update.useMutation({ onSuccess: onSaved, onError: e => toast.error(e.message) });

  const togglePlatform = (p: string) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleGender = (g: string) =>
    setGenders(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const toggleInterest = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name:          name.trim(),
      description:   description.trim() || undefined,
      platforms,
      ageMin:        ageMin ? parseInt(ageMin) : undefined,
      ageMax:        ageMax ? parseInt(ageMax) : undefined,
      genders,
      locations:     locations.split(",").map(s => s.trim()).filter(Boolean),
      interests,
      behaviors:     behaviors.split(",").map(s => s.trim()).filter(Boolean),
      languages:     languages.split(",").map(s => s.trim()).filter(Boolean),
      estimatedSize: estSize ? parseInt(estSize) : undefined,
      tags:          tags.split(",").map(s => s.trim()).filter(Boolean),
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
          <DialogTitle>{initial ? "Edit Audience" : "Create Saved Audience"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Audience Name *</Label>
            <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Young Tech Enthusiasts" />
          </div>
          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} rows={2} placeholder="Brief description..." />
          </div>
          {/* Platforms */}
          <div className="space-y-1.5">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    platforms.includes(p)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {/* Age Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Min Age</Label>
              <Input type="number" min={13} max={65} value={ageMin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgeMin(e.target.value)} placeholder="13" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Age</Label>
              <Input type="number" min={13} max={65} value={ageMax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgeMax(e.target.value)} placeholder="65" />
            </div>
          </div>
          {/* Genders */}
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <div className="flex gap-2">
              {ALL_GENDERS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGender(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    genders.includes(g)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          {/* Locations */}
          <div className="space-y-1.5">
            <Label>Locations (comma-separated)</Label>
            <Input value={locations} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocations(e.target.value)} placeholder="Saudi Arabia, UAE, Egypt" />
          </div>
          {/* Interests */}
          <div className="space-y-1.5">
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS_LIST.map(i => (
                <button
                  key={i}
                  onClick={() => toggleInterest(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    interests.includes(i)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          {/* Behaviors */}
          <div className="space-y-1.5">
            <Label>Behaviors (comma-separated)</Label>
            <Input value={behaviors} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBehaviors(e.target.value)} placeholder="Online shoppers, Mobile users" />
          </div>
          {/* Languages */}
          <div className="space-y-1.5">
            <Label>Languages (comma-separated)</Label>
            <Input value={languages} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLanguages(e.target.value)} placeholder="Arabic, English" />
          </div>
          {/* Estimated Size */}
          <div className="space-y-1.5">
            <Label>Estimated Audience Size</Label>
            <Input type="number" value={estSize} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEstSize(e.target.value)} placeholder="500000" />
          </div>
          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)} placeholder="retargeting, lookalike" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : initial ? "Update Audience" : "Create Audience"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SavedAudiences() {
  usePageTitle("Saved Audiences");
  const [search,      setSearch]      = useState("");
  const [filterPlat,  setFilterPlat]  = useState("all");
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<AudienceRow | null>(null);

  const utils = trpc.useUtils();
  const { data: audiences = [], isLoading } = trpc.savedAudiences.list.useQuery();
  const deleteMutation = trpc.savedAudiences.delete.useMutation({
    onSuccess: () => {
      toast.success("Audience deleted");
      utils.savedAudiences.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const handleDelete = (id: number) => {
    if (!confirm("Delete this saved audience?")) return;
    deleteMutation.mutate({ id });
  };

  const handleSaved = () => {
    toast.success(editTarget ? "Audience updated!" : "Audience saved!");
    setShowModal(false);
    setEditTarget(null);
    utils.savedAudiences.list.invalidate();
  };

  const filtered = (audiences as AudienceRow[]).filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    const matchPlat   = filterPlat === "all" || a.platforms.includes(filterPlat);
    return matchSearch && matchPlat;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-primary" />
            Saved Audiences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save and reuse audience segments across your campaigns
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          New Audience
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search audiences..."
            className="pl-9"
          />
        </div>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-40">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {ALL_PLATFORMS.map(p => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Audiences", value: audiences.length },
          { label: "Active Platforms", value: Array.from(new Set((audiences as AudienceRow[]).flatMap(a => a.platforms))).length },
          { label: "Avg Audience Size", value: (() => {
            const withSize = (audiences as AudienceRow[]).filter(a => a.estimated_size);
            if (!withSize.length) return "—";
            const avg = withSize.reduce((s, a) => s + (a.estimated_size ?? 0), 0) / withSize.length;
            return avg >= 1_000_000 ? `${(avg / 1_000_000).toFixed(1)}M` : `${(avg / 1000).toFixed(0)}K`;
          })() },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookmarkCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="font-semibold text-foreground mb-1">No saved audiences yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create audience segments to reuse across your campaigns
          </p>
          <Button onClick={() => { setEditTarget(null); setShowModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Create First Audience
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <AudienceCard
              key={a.id}
              audience={a}
              onEdit={aud => { setEditTarget(aud); setShowModal(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AudienceFormModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
