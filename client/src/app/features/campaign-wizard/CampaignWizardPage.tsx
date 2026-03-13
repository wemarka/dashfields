/**
 * CampaignWizardPage.tsx — Marketing Workflow Agent (Master).
 * Orchestrates the full campaign creation flow:
 * Discovery → Brand Assets → Generate → Creative Review → Content Plan → Budget → Preview → Launch
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Plus, Bot, Sparkles, Upload, Loader2,
  Image as ImageIcon, Wand2, ChevronRight, History,
} from "lucide-react";
import { Textarea } from "@/core/components/ui/textarea";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import ReactMarkdown from "react-markdown";
import { WizardProgressBar } from "./WizardProgressBar";
import { CreativeGrid } from "./CreativeGrid";
import { ContentPlanView } from "./ContentPlanView";
import { CampaignPreview } from "./CampaignPreview";
import type {
  WizardStep, WizardMessage, Creative, ContentPlanItem,
  BudgetAllocation, AudienceInsight, CampaignBrief,
} from "./types";
import { STEP_LABELS } from "./types";

// ─── Suggested Prompts ────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: "👟", text: "أريد عمل حملة إعلانية لمنتج أحذية رياضية" },
  { icon: "💄", text: "أريد إطلاق حملة لمنتجات مكياج جديدة" },
  { icon: "🏪", text: "أريد حملة ترويجية لمتجر إلكتروني" },
  { icon: "🎯", text: "أريد حملة توعية بعلامتي التجارية" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampaignWizardPage() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  // Workflow state
  const [workflowId, setWorkflowId]       = useState<string | null>(null);
  const [currentStep, setCurrentStep]     = useState<WizardStep>("discovery");
  const [messages, setMessages]           = useState<WizardMessage[]>([]);
  const [brief, setBrief]                 = useState<CampaignBrief>({});
  const [creatives, setCreatives]         = useState<Creative[]>([]);
  const [contentPlan, setContentPlan]     = useState<ContentPlanItem[]>([]);
  const [budgetAllocation, setBudgetAllocation] = useState<BudgetAllocation>({});
  const [insights, setInsights]           = useState<Record<string, AudienceInsight>>({});

  // UI state
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isConfirming, setIsConfirming]   = useState(false);
  const [showHistory, setShowHistory]     = useState(false);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC
  const createWorkflow      = trpc.campaignWorkflow.create.useMutation();
  const chatMutation        = trpc.campaignWorkflow.chat.useMutation();
  const uploadLogoMutation  = trpc.campaignWorkflow.uploadLogo.useMutation();
  const generateCreatives   = trpc.campaignWorkflow.generateCreatives.useMutation();
  const generatePlanMutation = trpc.campaignWorkflow.generateContentPlan.useMutation();
  const moveToPreview       = trpc.campaignWorkflow.moveToPreview.useMutation();
  const confirmMutation     = trpc.campaignWorkflow.confirm.useMutation();
  const { data: creativesData, refetch: refetchCreatives } = trpc.campaignWorkflow.getCreatives.useQuery(
    { workflowId: workflowId! },
    { enabled: !!workflowId && (currentStep === "generating" || currentStep === "creative_review" || currentStep === "content_plan" || currentStep === "budget_review" || currentStep === "preview"), staleTime: 5000 }
  );
  const { data: contentPlanData, refetch: refetchPlan } = trpc.campaignWorkflow.getContentPlan.useQuery(
    { workflowId: workflowId! },
    { enabled: !!workflowId && (currentStep === "budget_review" || currentStep === "preview"), staleTime: 5000 }
  );
  const { data: workflowHistory } = trpc.campaignWorkflow.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: !!user, staleTime: 30000 }
  );

  // Sync creatives from server
  useEffect(() => {
    if (creativesData) {
      setCreatives(creativesData.map(c => ({
        id: c.id,
        platform: c.platform,
        format: c.format,
        width: c.width,
        height: c.height,
        watermarkedUrl: c.watermarked_url,
        variant: (c.variant === "A" || c.variant === "B" ? c.variant : "A") as "A" | "B",
        status: (c.status === "watermarked" || c.status === "approved" || c.status === "rejected" ? c.status : "watermarked") as "watermarked" | "approved" | "rejected",
        approved: c.approved ?? false,
      })));
    }
  }, [creativesData]);

  // Sync content plan from server
  useEffect(() => {
    if (contentPlanData) {
      setContentPlan(contentPlanData.map(item => ({
        id: item.id,
        platform: item.platform,
        postDate: item.post_date,
        postTime: item.post_time,
        caption: item.caption,
        hashtags: item.hashtags ?? [],
        status: item.status,
      })));
    }
  }, [contentPlanData]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  // ── Ensure workflow exists ────────────────────────────────────────────────
  const ensureWorkflow = useCallback(async (): Promise<string> => {
    if (workflowId) return workflowId;
    const result = await createWorkflow.mutateAsync({
      workspaceId: activeWorkspace?.id,
    });
    setWorkflowId(result.id);
    return result.id;
  }, [workflowId, activeWorkspace, createWorkflow]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setIsLoading(true);

    const userMsg: WizardMessage = {
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
      type: "text",
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const wfId = await ensureWorkflow();
      const result = await chatMutation.mutateAsync({ workflowId: wfId, message: trimmed });

      const assistantMsg = result.message as WizardMessage;
      setMessages(prev => [...prev, assistantMsg]);

      // Update step if changed
      if (result.step && result.step !== currentStep) {
        setCurrentStep(result.step as WizardStep);
      }

      // Extract brief from data
      if (assistantMsg.data && typeof assistantMsg.data === "object") {
        const data = assistantMsg.data as Record<string, unknown>;
        if (data.readyToGenerate) {
          // Auto-trigger generation
          setTimeout(() => void triggerGeneration(wfId), 500);
        }
      }
    } catch (err) {
      toast.error("حدث خطأ في الاتصال، حاول مجدداً");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, ensureWorkflow, chatMutation, currentStep]);

  // ── Trigger image generation ──────────────────────────────────────────────
  const triggerGeneration = useCallback(async (wfId: string) => {
    setIsGenerating(true);
    setCurrentStep("generating");

    const genMsg: WizardMessage = {
      role: "assistant",
      content: "جاري توليد الصور الإعلانية... ⏳\n\nيتم توليد صورة لكل منصة بشكل متوازٍ مع إضافة شعارك تلقائياً. قد يستغرق هذا 30-60 ثانية.",
      timestamp: Date.now(),
      type: "text",
    };
    setMessages(prev => [...prev, genMsg]);

    try {
      const result = await generateCreatives.mutateAsync({ workflowId: wfId });
      setCurrentStep("creative_review");

      // Fetch creatives from DB (not from return value to avoid serialization issues)
      const freshCreatives = await refetchCreatives();

      const count = result.count ?? 0;
      const doneMsg: WizardMessage = {
        role: "assistant",
        content: `تم توليد ${count} صورة إعلانية! 🎨\n\nراجع الصور أدناه وافق على ما يناسبك أو اطلب توليد جديد.`,
        timestamp: Date.now(),
        type: "image_grid",
        data: { count },
      };
      setMessages(prev => [...prev, doneMsg]);

      if (freshCreatives.data && freshCreatives.data.length === 0) {
        toast.error("لم يتم توليد أي صور. تحقق من إعدادات الـ API.");
      }
    } catch (err) {
      toast.error("فشل توليد الصور. حاول مجدداً.");
      console.error(err);
      setCurrentStep("discovery");
    } finally {
      setIsGenerating(false);
    }
  }, [generateCreatives, refetchCreatives]);

  // ── Handle logo upload ────────────────────────────────────────────────────
  const handleLogoUpload = useCallback(async (file: File) => {
    if (!workflowId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى رفع صورة PNG أو JPEG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الشعار يجب أن يكون أقل من 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      try {
        const result = await uploadLogoMutation.mutateAsync({
          workflowId,
          workspaceId: activeWorkspace?.id ?? 0,
          imageBase64: base64,
          mimeType: file.type,
          setAsDefault: true,
        });

        const logoMsg: WizardMessage = {
          role: "assistant",
          content: "تم رفع الشعار بنجاح! ✅\n\nسيتم إضافته تلقائياً على جميع الصور الإعلانية. الآن سأبدأ توليد الصور...",
          timestamp: Date.now(),
          type: "text",
        };
        setMessages(prev => [...prev, logoMsg]);
        setCurrentStep(result.step as WizardStep);
        setTimeout(() => void triggerGeneration(workflowId), 1000);
      } catch {
        toast.error("فشل رفع الشعار، حاول مجدداً");
      }
    };
    reader.readAsDataURL(file);
  }, [workflowId, activeWorkspace, uploadLogoMutation, triggerGeneration]);

  // ── Handle creative approval change ──────────────────────────────────────
  const handleApprovalChange = useCallback((creativeId: string, approved: boolean) => {
    setCreatives(prev => prev.map(c => c.id === creativeId ? { ...c, approved, status: approved ? "approved" : "rejected" } : c));
  }, []);

  // ── Proceed from creative review to content plan ──────────────────────────
  const handleProceedToContentPlan = useCallback(async () => {
    if (!workflowId) return;
    setIsGeneratingPlan(true);

    const planMsg: WizardMessage = {
      role: "assistant",
      content: "ممتاز! جاري إعداد خطة المحتوى وتحسين الميزانية... ⏳",
      timestamp: Date.now(),
      type: "text",
    };
    setMessages(prev => [...prev, planMsg]);
    setCurrentStep("content_plan");

    try {
      const result = await generatePlanMutation.mutateAsync({ workflowId });
      setBudgetAllocation(result.budgetAllocation as BudgetAllocation);
      setInsights(result.insights as Record<string, AudienceInsight>);
      setContentPlan(result.plan.map((item: Record<string, unknown>) => ({
        id: String(Math.random()),
        platform: String(item.platform),
        postDate: String(item.postDate),
        postTime: String(item.postTime),
        caption: String(item.caption),
        hashtags: (item.hashtags as string[]) ?? [],
        status: "draft",
      })));
      setCurrentStep("budget_review");
      await refetchPlan();
    } catch (err) {
      toast.error("فشل إعداد خطة المحتوى");
      console.error(err);
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [workflowId, generatePlanMutation, refetchPlan]);

  // ── Proceed to preview ────────────────────────────────────────────────────
  const handleProceedToPreview = useCallback(async () => {
    if (!workflowId) return;
    await moveToPreview.mutateAsync({ workflowId });
    setCurrentStep("preview");
    await refetchCreatives();
    await refetchPlan();
  }, [workflowId, moveToPreview, refetchCreatives, refetchPlan]);

  // ── Confirm campaign ──────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!workflowId) return;
    setIsConfirming(true);
    try {
      await confirmMutation.mutateAsync({ workflowId });
      setCurrentStep("confirmed");

      const successMsg: WizardMessage = {
        role: "assistant",
        content: "🎉 تم تأكيد الحملة بنجاح!\n\nتم حفظ الحملة وجدولة المنشورات. يمكنك متابعة أداء الحملة من قسم **التحليلات**.",
        timestamp: Date.now(),
        type: "text",
      };
      setMessages(prev => [...prev, successMsg]);
      toast.success("تم إطلاق الحملة بنجاح! 🚀");
    } catch {
      toast.error("فشل تأكيد الحملة");
    } finally {
      setIsConfirming(false);
    }
  }, [workflowId, confirmMutation]);

  // ── Load existing workflow ────────────────────────────────────────────────
  const handleLoadWorkflow = useCallback((wf: Record<string, unknown>) => {
    setWorkflowId(wf.id as string);
    setCurrentStep(wf.step as WizardStep);
    setMessages((wf.messages as WizardMessage[]) ?? []);
    setBrief((wf.brief as CampaignBrief) ?? {});
    if (wf.budget_allocation) setBudgetAllocation(wf.budget_allocation as BudgetAllocation);
    if (wf.audience_insights) setInsights(wf.audience_insights as Record<string, AudienceInsight>);
    setShowHistory(false);
  }, []);

  const handleNewCampaign = useCallback(() => {
    setWorkflowId(null);
    setCurrentStep("discovery");
    setMessages([]);
    setBrief({});
    setCreatives([]);
    setContentPlan([]);
    setBudgetAllocation({});
    setInsights({});
    setInput("");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(input); }
  }, [input, sendMessage]);

  const isInChat = messages.length > 0;
  const approvedCreatives = creatives.filter(c => c.approved);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "#faf8f5" }} />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.05) 0%, transparent 65%)",
          top: "-5%", left: "25%",
        }}
      />

      {/* History Sidebar */}
      {showHistory && (
        <div className="relative z-20 w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">الحملات السابقة</span>
            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {workflowHistory?.length === 0 && (
              <p className="text-center text-gray-400 text-xs py-8">لا توجد حملات سابقة</p>
            )}
            {workflowHistory?.map(wf => (
              <button
                key={wf.id}
                onClick={() => handleLoadWorkflow(wf as unknown as Record<string, unknown>)}
                className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors mb-1"
              >
                <p className="text-sm font-medium text-gray-800 truncate">
                  {(wf.brief as CampaignBrief)?.name ?? "حملة جديدة"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="text-[10px] bg-gray-100 text-gray-600 border-0">
                    {STEP_LABELS[wf.step as WizardStep] ?? wf.step}
                  </Badge>
                  <span className="text-[10px] text-gray-400">
                    {new Date(wf.created_at).toLocaleDateString("ar")}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-gray-100">
            <Button onClick={handleNewCampaign} className="w-full bg-red-600 hover:bg-red-700 text-white text-xs">
              <Plus className="w-3 h-3 mr-1" />
              حملة جديدة
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Progress Bar (only when in workflow) */}
        {isInChat && <WizardProgressBar currentStep={currentStep} />}

        {/* Header bar */}
        <div className={cn(
          "flex items-center justify-between px-5 py-3 shrink-0",
          isInChat ? "border-b border-gray-200/80 bg-white/60 backdrop-blur-sm" : "",
        )}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}>
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Marketing Workflow</span>
            {isInChat && (
              <Badge className="text-[10px] bg-red-50 text-red-600 border-red-100">
                {STEP_LABELS[currentStep]}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <History className="w-3.5 h-3.5" />
              السابقة
            </button>
            {isInChat && (
              <button
                onClick={handleNewCampaign}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <Plus className="w-3 h-3" />
                حملة جديدة
              </button>
            )}
          </div>
        </div>

        {/* ── Empty State ── */}
        {!isInChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 overflow-y-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)", boxShadow: "0 0 40px rgba(220,38,38,0.35)" }}>
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[2rem] font-bold text-gray-900 mb-2 tracking-tight">
                Marketing Workflow Agent
              </h1>
              <p className="text-gray-500 text-[15px] max-w-md">
                أخبرني عن حملتك الإعلانية وسأتولى كل شيء — من توليد الصور إلى خطة المحتوى والميزانية
              </p>
            </div>

            {/* Input */}
            <div className="w-full max-w-2xl animate-fade-in mb-5" style={{ animationDelay: "0.1s" }}>
              <WizardInputBox
                input={input} setInput={setInput} isLoading={isLoading}
                onSend={() => void sendMessage(input)} onKeyDown={handleKeyDown}
                textareaRef={textareaRef}
                onLogoUpload={handleLogoUpload}
                showLogoUpload={currentStep === "brand_assets"}
                fileInputRef={fileInputRef}
              />
            </div>

            {/* Suggested prompts */}
            <div className="w-full max-w-2xl grid grid-cols-2 gap-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p.text}
                  onClick={() => void sendMessage(p.text)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/30 transition-all text-left text-sm text-gray-700 group"
                >
                  <span className="text-xl shrink-0">{p.icon}</span>
                  <span className="leading-snug group-hover:text-red-700 transition-colors">{p.text}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 mr-auto shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chat + Workflow State ── */}
        {isInChat && (
          <div className="flex flex-1 overflow-hidden">
            {/* Chat column */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 scrollbar-none">
                <div className="max-w-2xl mx-auto space-y-4">
                  {messages.map((msg, idx) => (
                    <WizardMessageBubble key={idx} msg={msg} />
                  ))}
                  {isLoading && <ThinkingBubble />}
                </div>
              </div>

              {/* Input */}
              <div className="px-4 pb-4 shrink-0">
                <div className="max-w-2xl mx-auto">
                  <WizardInputBox
                    input={input} setInput={setInput} isLoading={isLoading || isGenerating}
                    onSend={() => void sendMessage(input)} onKeyDown={handleKeyDown}
                    textareaRef={textareaRef}
                    onLogoUpload={handleLogoUpload}
                    showLogoUpload={currentStep === "brand_assets"}
                    fileInputRef={fileInputRef}
                  />
                </div>
              </div>
            </div>

            {/* Right panel: workflow UI */}
            {(currentStep === "creative_review" || currentStep === "content_plan" || currentStep === "budget_review" || currentStep === "preview" || currentStep === "confirmed") && (
              <div className="w-[420px] shrink-0 border-l border-gray-100 bg-white/50 overflow-y-auto p-4">
                {/* Creative Review */}
                {(currentStep === "creative_review" || currentStep === "content_plan") && (
                  <CreativeGrid
                    workflowId={workflowId!}
                    creatives={creatives}
                    onApprovalChange={handleApprovalChange}
                    onRegenerateRequest={() => void triggerGeneration(workflowId!)}
                    onProceed={handleProceedToContentPlan}
                    isGenerating={isGenerating || isGeneratingPlan}
                  />
                )}

                {/* Content Plan + Budget */}
                {currentStep === "budget_review" && (
                  <ContentPlanView
                    items={contentPlan}
                    budgetAllocation={budgetAllocation}
                    insights={insights}
                    currency={brief.currency ?? "SAR"}
                    totalBudget={brief.budget ?? 0}
                    onProceed={handleProceedToPreview}
                  />
                )}

                {/* Campaign Preview */}
                {(currentStep === "preview" || currentStep === "confirmed") && (
                  <CampaignPreview
                    brief={brief}
                    approvedCreatives={approvedCreatives}
                    contentPlan={contentPlan}
                    budgetAllocation={budgetAllocation}
                    onConfirm={handleConfirm}
                    isConfirming={isConfirming}
                  />
                )}
              </div>
            )}

            {/* Generating overlay */}
            {isGenerating && currentStep === "generating" && (
              <div className="w-[420px] shrink-0 border-l border-gray-100 bg-white/50 flex items-center justify-center">
                <CreativeGrid
                  workflowId={workflowId!}
                  creatives={[]}
                  onApprovalChange={() => {}}
                  onRegenerateRequest={() => {}}
                  onProceed={() => {}}
                  isGenerating={true}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for logo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleLogoUpload(file);
        }}
      />
    </div>
  );
}

// ─── Input Box ────────────────────────────────────────────────────────────────
function WizardInputBox({
  input, setInput, isLoading, onSend, onKeyDown, textareaRef,
  onLogoUpload, showLogoUpload, fileInputRef,
}: {
  input: string; setInput: (v: string) => void; isLoading: boolean;
  onSend: () => void; onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onLogoUpload: (file: File) => void;
  showLogoUpload: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const hasText = input.trim().length > 0;

  return (
    <div
      className="relative flex flex-col rounded-2xl transition-all duration-200 border border-gray-200 hover:border-gray-300 focus-within:border-red-400/60 bg-white"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)" }}
    >
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="أخبرني عن حملتك... (مثال: أريد حملة لمنتج أحذية رياضية)"
        disabled={isLoading}
        rows={1}
        dir="rtl"
        className="resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] text-gray-800 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[28px] max-h-[140px] leading-relaxed text-right"
        style={{ boxShadow: "none" }}
      />
      <div className="flex items-center justify-between px-3 pb-3 pt-1 flex-row-reverse">
        <div className="flex items-center gap-1 flex-row-reverse">
          {showLogoUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all"
            >
              <Upload className="w-3 h-3" />
              رفع الشعار
            </button>
          )}
          <button type="button" className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button type="button" className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onSend}
          disabled={!hasText || isLoading}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
            hasText && !isLoading ? "text-white hover:scale-105 active:scale-95" : "text-gray-300 cursor-not-allowed",
          )}
          style={hasText && !isLoading ? {
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
            boxShadow: "0 2px 12px rgba(220,38,38,0.5)",
          } : { background: "#f3f4f6" }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
        </button>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function WizardMessageBubble({ msg }: { msg: WizardMessage }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-start animate-fade-in">
        <div
          className="max-w-[78%] px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed text-white"
          style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", boxShadow: "0 2px 12px rgba(220,38,38,0.3)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-in flex-row-reverse">
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mt-0.5"
        style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}
      >
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="px-4 py-3 rounded-2xl rounded-tr-md border border-gray-200 bg-white text-sm text-gray-800">
          <div className="prose prose-sm max-w-none prose-p:text-gray-800 prose-strong:text-gray-900 prose-p:leading-relaxed">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3 animate-fade-in flex-row-reverse">
      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mt-0.5"
        style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}>
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tr-md border border-gray-200 bg-white">
        <div className="flex items-center gap-1 py-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-red-400"
              style={{ animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
