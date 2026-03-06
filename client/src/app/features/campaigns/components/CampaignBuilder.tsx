/**
 * CampaignBuilder.tsx — 4-step campaign wizard orchestrator.
 * Step logic lives in ./builder-steps/ submodules.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { X, ChevronRight, ChevronLeft, Rocket, BarChart3, Loader2 } from "lucide-react";
import {
  type Step,
  StepIndicator,
  Step1Campaign,
  Step2AdSet,
  Step3Creative,
  Step4Review,
} from "./builder-steps";

export function CampaignBuilder({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name,      setName]      = useState("");
  const [objective, setObjective] = useState("AWARENESS");
  type CampaignPlatform = "facebook" | "instagram" | "linkedin" | "twitter" | "youtube" | "tiktok" | "google";
  const [platform,  setPlatform]  = useState<CampaignPlatform>("facebook");

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
      platform,
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
          {step === 1 && <Step1Campaign name={name} setName={setName} objective={objective} setObjective={setObjective} platform={platform} setPlatform={(v) => setPlatform(v as CampaignPlatform)} />}
          {step === 2 && <Step2AdSet budget={budget} setBudget={setBudget} budgetType={budgetType} setBudgetType={setBudgetType} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} ageMin={ageMin} setAgeMin={setAgeMin} ageMax={ageMax} setAgeMax={setAgeMax} gender={gender} setGender={setGender} selectedInterests={selectedInterests} setSelectedInterests={setSelectedInterests} selectedLocations={selectedLocations} setSelectedLocations={setSelectedLocations} />}
          {step === 3 && <Step3Creative headline={headline} setHeadline={setHeadline} body={body} setBody={setBody} cta={cta} setCta={setCta} imageUrl={imageUrl} setImageUrl={setImageUrl} destinationUrl={destinationUrl} setDestinationUrl={setDestinationUrl} platform={platform} objective={objective} campaignName={name} />}
          {step === 4 && <Step4Review name={name} objective={objective} platform={platform} budget={budget} budgetType={budgetType} startDate={startDate} endDate={endDate} ageMin={ageMin} ageMax={ageMax} gender={gender} selectedInterests={selectedInterests} selectedLocations={selectedLocations} headline={headline} body={body} cta={cta} imageUrl={imageUrl} destinationUrl={destinationUrl} />}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-muted/20">
          <button onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />{step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Continue<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleLaunch} disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
