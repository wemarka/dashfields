/**
 * CampaignBuilder.tsx
 * Full-featured 4-step campaign wizard:
 * Step 1 — Campaign (name, objective, platform)
 * Step 2 — Ad Set (budget, schedule, audience targeting)
 * Step 3 — Ad Creative (headline, body, image, CTA)
 * Step 4 — Review & Launch
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  X, ChevronRight, ChevronLeft, Rocket, Target, Users, Image,
  DollarSign, Calendar, Globe, Wand2, Upload, CheckCircle2,
  Sparkles, BarChart3, ShoppingCart, MessageSquare, Heart,
  Play, Eye, MousePointer, Loader2, Info,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4;

const OBJECTIVES = [
  { id: "AWARENESS",    label: "Brand Awareness",  icon: Eye,          desc: "Maximize reach & brand recall" },
  { id: "TRAFFIC",      label: "Traffic",           icon: MousePointer, desc: "Drive clicks to your website" },
  { id: "ENGAGEMENT",   label: "Engagement",        icon: Heart,        desc: "Boost likes, comments & shares" },
  { id: "LEADS",        label: "Lead Generation",   icon: Users,        desc: "Collect leads & contact info" },
  { id: "CONVERSIONS",  label: "Conversions",       icon: ShoppingCart, desc: "Drive purchases & sign-ups" },
  { id: "VIDEO_VIEWS",  label: "Video Views",       icon: Play,         desc: "Maximize video watch time" },
  { id: "MESSAGES",     label: "Messages",          icon: MessageSquare,desc: "Start conversations on Messenger" },
  { id: "APP_INSTALLS", label: "App Installs",      icon: Rocket,       desc: "Drive app downloads" },
];

const PLATFORMS_SUPPORTED = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"];

const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS    = ["All", "Male", "Female"];
const INTERESTS  = [
  "Technology", "Fashion", "Sports", "Travel", "Food & Dining",
  "Health & Fitness", "Business", "Entertainment", "Education",
  "Finance", "Automotive", "Real Estate", "Gaming", "Beauty",
  "Parenting", "Music", "Art & Design", "Politics", "Science",
];
const LOCATIONS = [
  "Saudi Arabia", "UAE", "Egypt", "Jordan", "Kuwait", "Qatar",
  "Bahrain", "Oman", "Lebanon", "Iraq", "Morocco", "Tunisia",
  "United States", "United Kingdom", "Germany", "France",
  "India", "Pakistan", "Turkey", "Indonesia",
];
const CTAS = ["Learn More", "Shop Now", "Sign Up", "Contact Us", "Download", "Watch More", "Get Offer", "Book Now"];

// ─── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Campaign" },
    { n: 2, label: "Ad Set" },
    { n: 3, label: "Creative" },
    { n: 4, label: "Review" },
  ];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1">
            <div className={[
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              step > s.n  ? "bg-emerald-500 text-white" :
              step === s.n ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
              "bg-muted text-muted-foreground",
            ].join(" ")}>
              {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={`text-[10px] font-medium whitespace-nowrap ${step === s.n ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all ${step > s.n ? "bg-emerald-500" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Campaign ─────────────────────────────────────────────────────────
function Step1Campaign({
  name, setName, objective, setObjective, platform, setPlatform,
}: {
  name: string; setName: (v: string) => void;
  objective: string; setObjective: (v: string) => void;
  platform: string; setPlatform: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Campaign Name */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Campaign Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Summer Sale 2025 — Brand Awareness"
          className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
      </div>
      {/* Platform */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Platform *</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PLATFORMS_SUPPORTED.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={[
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                platform === p
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:bg-muted/50",
              ].join(" ")}
            >
              <PlatformIcon platform={p} className="w-5 h-5" />
              <span className="text-[10px] font-medium text-muted-foreground capitalize">{p}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Objective */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Campaign Objective *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.id}
              onClick={() => setObjective(obj.id)}
              className={[
                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                objective === obj.id
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:bg-muted/50",
              ].join(" ")}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${objective === obj.id ? "bg-primary/10" : "bg-muted"}`}>
                <obj.icon className={`w-4 h-4 ${objective === obj.id ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{obj.label}</p>
                <p className="text-[10px] text-muted-foreground">{obj.desc}</p>
              </div>
              {objective === obj.id && <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Ad Set ────────────────────────────────────────────────────────────
function Step2AdSet({
  budget, setBudget, budgetType, setBudgetType,
  startDate, setStartDate, endDate, setEndDate,
  ageMin, setAgeMin, ageMax, setAgeMax,
  gender, setGender, selectedInterests, setSelectedInterests,
  selectedLocations, setSelectedLocations,
}: {
  budget: string; setBudget: (v: string) => void;
  budgetType: "daily" | "lifetime"; setBudgetType: (v: "daily" | "lifetime") => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  ageMin: string; setAgeMin: (v: string) => void;
  ageMax: string; setAgeMax: (v: string) => void;
  gender: string; setGender: (v: string) => void;
  selectedInterests: string[]; setSelectedInterests: (v: string[]) => void;
  selectedLocations: string[]; setSelectedLocations: (v: string[]) => void;
}) {
  const toggleInterest = (i: string) => {
    setSelectedInterests(
      selectedInterests.includes(i)
        ? selectedInterests.filter((x) => x !== i)
        : [...selectedInterests, i]
    );
  };
  const toggleLocation = (l: string) => {
    setSelectedLocations(
      selectedLocations.includes(l)
        ? selectedLocations.filter((x) => x !== l)
        : [...selectedLocations, l]
    );
  };

  return (
    <div className="space-y-5">
      {/* Budget */}
      <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-primary" /> Budget
        </h3>
        <div className="flex gap-2">
          {(["daily", "lifetime"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setBudgetType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${budgetType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {t === "daily" ? "Daily Budget" : "Lifetime Budget"}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input
            type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
            placeholder="0.00" min="1" step="0.01"
            className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />
          {budgetType === "daily" ? "Amount spent per day" : "Total amount for the campaign duration"}
        </p>
      </div>
      {/* Schedule */}
      <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" /> Schedule
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">End Date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>
      {/* Audience */}
      <div className="bg-muted/30 rounded-2xl p-4 space-y-4">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-primary" /> Audience Targeting
        </h3>
        {/* Age + Gender */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Min Age</label>
            <select value={ageMin} onChange={(e) => setAgeMin(e.target.value)}
              className="w-full px-2 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none">
              {[18,21,25,30,35,40,45,50,55,60,65].map((a) => <option key={a} value={String(a)}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Max Age</label>
            <select value={ageMax} onChange={(e) => setAgeMax(e.target.value)}
              className="w-full px-2 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none">
              {[24,30,35,40,45,50,55,60,65,99].map((a) => <option key={a} value={String(a)}>{a === 99 ? "65+" : a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)}
              className="w-full px-2 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none">
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        {/* Locations */}
        <div>
          <label className="text-[10px] text-muted-foreground mb-2 block flex items-center gap-1">
            <Globe className="w-3 h-3" /> Locations ({selectedLocations.length} selected)
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {LOCATIONS.map((l) => (
              <button key={l} onClick={() => toggleLocation(l)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${selectedLocations.includes(l) ? "bg-primary/10 border-primary/30 text-primary font-medium" : "bg-background border-border text-muted-foreground hover:border-primary/20"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {/* Interests */}
        <div>
          <label className="text-[10px] text-muted-foreground mb-2 block flex items-center gap-1">
            <Target className="w-3 h-3" /> Interests ({selectedInterests.length} selected)
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {INTERESTS.map((i) => (
              <button key={i} onClick={() => toggleInterest(i)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${selectedInterests.includes(i) ? "bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 font-medium" : "bg-background border-border text-muted-foreground hover:border-violet-200"}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Ad Creative ───────────────────────────────────────────────────────
function Step3Creative({
  headline, setHeadline, body, setBody, cta, setCta,
  imageUrl, setImageUrl, destinationUrl, setDestinationUrl,
  platform,
}: {
  headline: string; setHeadline: (v: string) => void;
  body: string; setBody: (v: string) => void;
  cta: string; setCta: (v: string) => void;
  imageUrl: string; setImageUrl: (v: string) => void;
  destinationUrl: string; setDestinationUrl: (v: string) => void;
  platform: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.posts.uploadImage.useMutation({
    onSuccess: (data) => { setImageUrl(data.url); toast.success("Image uploaded!"); },
    onError: (err) => toast.error("Upload failed: " + err.message),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadMutation.mutate({ base64, mimeType: file.type, filename: file.name });
    };
    reader.readAsDataURL(file);
  };

  const charLimit = platform === "twitter" ? 280 : platform === "linkedin" ? 3000 : 2200;

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1.5">
          <Image className="w-3.5 h-3.5 text-primary" /> Ad Image / Video
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors group"
          style={{ minHeight: 140 }}
        >
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="Ad creative" className="w-full max-h-48 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white text-xs font-medium">Click to change</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              {uploadMutation.isPending ? (
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Click to upload image (max 10MB)</p>
                  <p className="text-[10px] text-muted-foreground/60">JPG, PNG, GIF, WebP</p>
                </>
              )}
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      {/* Headline */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Headline *</label>
        <input
          value={headline} onChange={(e) => setHeadline(e.target.value)}
          placeholder="Grab attention in one line..."
          maxLength={125}
          className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-[10px] text-muted-foreground mt-1 text-right">{headline.length}/125</p>
      </div>
      {/* Body */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Ad Copy *</label>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Describe your offer, product, or message..."
          rows={4} maxLength={charLimit}
          className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <p className={`text-[10px] mt-1 text-right ${body.length > charLimit * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>
          {body.length}/{charLimit}
        </p>
      </div>
      {/* CTA + URL */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Call to Action</label>
          <select value={cta} onChange={(e) => setCta(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30">
            {CTAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Destination URL</label>
          <input
            value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      {/* Preview */}
      {(headline || body) && (
        <div className="bg-muted/30 rounded-2xl p-4 border border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Ad Preview
          </p>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {imageUrl && <img src={imageUrl} alt="preview" className="w-full h-32 object-cover" />}
            <div className="p-3">
              {headline && <p className="text-sm font-semibold text-foreground">{headline}</p>}
              {body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{body}</p>}
              {cta && (
                <div className="mt-2">
                  <span className="text-[11px] px-3 py-1 rounded-lg bg-primary text-primary-foreground font-medium">{cta}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Review ────────────────────────────────────────────────────────────
function Step4Review({
  name, objective, platform, budget, budgetType, startDate, endDate,
  ageMin, ageMax, gender, selectedInterests, selectedLocations,
  headline, body, cta, imageUrl, destinationUrl,
}: {
  name: string; objective: string; platform: string;
  budget: string; budgetType: string; startDate: string; endDate: string;
  ageMin: string; ageMax: string; gender: string;
  selectedInterests: string[]; selectedLocations: string[];
  headline: string; body: string; cta: string; imageUrl: string; destinationUrl: string;
}) {
  const obj = OBJECTIVES.find((o) => o.id === objective);
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Campaign Summary</h3>
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Campaign Name", value: name },
            { label: "Platform", value: <span className="flex items-center gap-1.5"><PlatformIcon platform={platform} className="w-3.5 h-3.5" /><span className="capitalize">{platform}</span></span> },
            { label: "Objective", value: obj?.label ?? objective },
            { label: "Budget", value: `$${budget} ${budgetType}` },
            { label: "Schedule", value: `${startDate || "Today"}${endDate ? ` → ${endDate}` : " (ongoing)"}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-primary" /> Audience
        </h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-muted-foreground text-[10px]">Age</p>
            <p className="font-semibold text-foreground">{ageMin}–{ageMax === "99" ? "65+" : ageMax}</p>
          </div>
          <div className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-muted-foreground text-[10px]">Gender</p>
            <p className="font-semibold text-foreground">{gender}</p>
          </div>
          <div className="bg-card rounded-xl p-2.5 text-center">
            <p className="text-muted-foreground text-[10px]">Locations</p>
            <p className="font-semibold text-foreground">{selectedLocations.length || "All"}</p>
          </div>
        </div>
        {selectedInterests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedInterests.slice(0, 6).map((i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">{i}</span>
            ))}
            {selectedInterests.length > 6 && <span className="text-[10px] text-muted-foreground">+{selectedInterests.length - 6} more</span>}
          </div>
        )}
      </div>
      {(headline || body) && (
        <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <Wand2 className="w-3.5 h-3.5 text-primary" /> Ad Creative
          </h3>
          {imageUrl && <img src={imageUrl} alt="ad" className="w-full h-24 object-cover rounded-xl" />}
          {headline && <p className="text-sm font-semibold text-foreground">{headline}</p>}
          {body && <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {cta && <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium">{cta}</span>}
            {destinationUrl && <span className="truncate">{destinationUrl}</span>}
          </div>
        </div>
      )}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Campaign will be saved as <strong>Draft</strong>. You can activate it from the Campaigns page after connecting your ad account.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CampaignBuilder({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name,      setName]      = useState("");
  const [objective, setObjective] = useState("AWARENESS");
  const [platform,  setPlatform]  = useState("facebook");

  // Step 2
  const [budget,    setBudget]    = useState("50");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate,   setEndDate]   = useState("");
  const [ageMin,    setAgeMin]    = useState("18");
  const [ageMax,    setAgeMax]    = useState("65");
  const [gender,    setGender]    = useState("All");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Step 3
  const [headline,       setHeadline]       = useState("");
  const [body,           setBody]           = useState("");
  const [cta,            setCta]            = useState("Learn More");
  const [imageUrl,       setImageUrl]       = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");

  const utils = trpc.useUtils();
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      toast.success("Campaign created as draft!");
      utils.campaigns.list.invalidate();
      onCreated();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0 && objective && platform;
    if (step === 2) return parseFloat(budget) > 0 && startDate;
    if (step === 3) return headline.trim().length > 0 && body.trim().length > 0;
    return true;
  };

  const handleLaunch = () => {
    createMutation.mutate({
      name,
      platform: platform as any,
      objective: objective.toLowerCase(),
      budget: parseFloat(budget) || 0,
      budgetType,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate:   endDate   ? new Date(endDate).toISOString()   : undefined,
      metadata: {
        audience: { ageMin, ageMax, gender, interests: selectedInterests, locations: selectedLocations },
        creative: { headline, body, cta, imageUrl, destinationUrl },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Campaign Builder</h2>
              <p className="text-[10px] text-muted-foreground">Create a new ad campaign</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <StepIndicator step={step} />
          {step === 1 && <Step1Campaign name={name} setName={setName} objective={objective} setObjective={setObjective} platform={platform} setPlatform={setPlatform} />}
          {step === 2 && <Step2AdSet budget={budget} setBudget={setBudget} budgetType={budgetType} setBudgetType={setBudgetType} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} ageMin={ageMin} setAgeMin={setAgeMin} ageMax={ageMax} setAgeMax={setAgeMax} gender={gender} setGender={setGender} selectedInterests={selectedInterests} setSelectedInterests={setSelectedInterests} selectedLocations={selectedLocations} setSelectedLocations={setSelectedLocations} />}
          {step === 3 && <Step3Creative headline={headline} setHeadline={setHeadline} body={body} setBody={setBody} cta={cta} setCta={setCta} imageUrl={imageUrl} setImageUrl={setImageUrl} destinationUrl={destinationUrl} setDestinationUrl={setDestinationUrl} platform={platform} />}
          {step === 4 && <Step4Review name={name} objective={objective} platform={platform} budget={budget} budgetType={budgetType} startDate={startDate} endDate={endDate} ageMin={ageMin} ageMax={ageMax} gender={gender} selectedInterests={selectedInterests} selectedLocations={selectedLocations} headline={headline} body={body} cta={cta} imageUrl={imageUrl} destinationUrl={destinationUrl} />}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-muted/20">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
