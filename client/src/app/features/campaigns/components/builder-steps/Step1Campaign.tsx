/**
 * builder-steps/Step1Campaign.tsx — Step indicator + campaign name/platform/objective.
 */
import { CheckCircle2 } from "lucide-react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { type Step, OBJECTIVES, PLATFORMS_SUPPORTED } from "./constants";

export function StepIndicator({ step }: { step: Step }) {
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

export function Step1Campaign({
  name, setName, objective, setObjective, platform, setPlatform,
}: {
  name: string; setName: (v: string) => void;
  objective: string; setObjective: (v: string) => void;
  platform: string; setPlatform: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Campaign Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Summer Sale 2025 — Brand Awareness"
          className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Platform *</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PLATFORMS_SUPPORTED.map((p) => (
            <button key={p} onClick={() => setPlatform(p)}
              className={["flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                platform === p ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50"].join(" ")}>
              <PlatformIcon platform={p} className="w-5 h-5" />
              <span className="text-[10px] font-medium text-muted-foreground capitalize">{p}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Campaign Objective *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OBJECTIVES.map((obj) => (
            <button key={obj.id} onClick={() => setObjective(obj.id)}
              className={["flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                objective === obj.id ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50"].join(" ")}>
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
