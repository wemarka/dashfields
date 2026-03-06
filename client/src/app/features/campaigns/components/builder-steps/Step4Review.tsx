/**
 * builder-steps/Step4Review.tsx — Campaign summary review before launch.
 */
import { Users, Sparkles, Wand2, Info } from "lucide-react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { OBJECTIVES } from "./constants";

export function Step4Review({
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
