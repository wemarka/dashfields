/**
 * builder-steps/Step2AdSet.tsx — Budget, schedule, audience targeting.
 */
import { DollarSign, Calendar, Users, Globe, Info } from "lucide-react";
import { GENDERS, INTERESTS, LOCATIONS } from "./constants";

export function Step2AdSet({
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
  const toggleInterest = (i: string) => setSelectedInterests(selectedInterests.includes(i) ? selectedInterests.filter((x) => x !== i) : [...selectedInterests, i]);
  const toggleLocation = (l: string) => setSelectedLocations(selectedLocations.includes(l) ? selectedLocations.filter((x) => x !== l) : [...selectedLocations, l]);

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-primary" /> Budget</h3>
        <div className="flex gap-2">
          {(["daily", "lifetime"] as const).map((t) => (
            <button key={t} onClick={() => setBudgetType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${budgetType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t === "daily" ? "Daily Budget" : "Lifetime Budget"}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" min="1" step="0.01"
            className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />{budgetType === "daily" ? "Amount spent per day" : "Total amount for the campaign duration"}
        </p>
      </div>
      <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-primary" /> Schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">End Date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>
      <div className="bg-muted/30 rounded-2xl p-4 space-y-4">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2"><Users className="w-3.5 h-3.5 text-primary" /> Audience Targeting</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1.5 block">Age Range</label>
            <div className="flex gap-1.5">
              <select value={ageMin} onChange={(e) => setAgeMin(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground outline-none">
                {["18","25","35","45","55","65"].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <span className="text-xs text-muted-foreground self-center">–</span>
              <select value={ageMax} onChange={(e) => setAgeMax(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground outline-none">
                {["24","34","44","54","64","65"].map((a) => <option key={a} value={a}>{a === "65" ? "65+" : a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1.5 block">Gender</label>
            <div className="flex gap-1">
              {GENDERS.map((g) => (
                <button key={g} onClick={() => setGender(g)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${gender === g ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:bg-muted"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1.5 block">Interests ({selectedInterests.length} selected)</label>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map((i) => (
              <button key={i} onClick={() => toggleInterest(i)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${selectedInterests.includes(i) ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1.5 block flex items-center gap-1">
            <Globe className="w-3 h-3" /> Locations ({selectedLocations.length || "All"})
          </label>
          <div className="flex flex-wrap gap-1.5">
            {LOCATIONS.map((l) => (
              <button key={l} onClick={() => toggleLocation(l)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${selectedLocations.includes(l) ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
