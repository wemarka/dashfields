/**
 * CampaignWizardPage.tsx — Marketing Workflow Agent (Master).
 * Orchestrates the full campaign creation flow:
 * Discovery → Brand Assets → Generate → Creative Review → Content Plan → Budget → Preview → Launch
 *
 * Layout:
 *  - Main page: chat interface only (clean, focused)
 *  - Workflow steps (creative review, content plan, budget, preview): centered Dialog
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Plus, Bot, Sparkles, Upload, Loader2,
  Image as ImageIcon, Wand2, ChevronRight, History,
  X, ArrowRight, ArrowLeft,
} from "lucide-react";
import { Textarea } from "@/core/components/ui/textarea";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { cn } from "@/core/lib/utils";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import ReactMarkdown from "react-markdown";
import { CreativeGrid } from "./CreativeGrid";
import { ContentPlanView } from "./ContentPlanView";
import { CampaignPreview } from "./CampaignPreview";
import type {
  WizardStep, WizardMessage, Creative, ContentPlanItem,
  BudgetAllocation, AudienceInsight, CampaignBrief,
} from "./types";
import { STEP_LABELS, STEP_ORDER } from "./types";

// ─── Suggested Prompts ────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: "👟", text: "أريد عمل حملة إعلانية لمنتج أحذية رياضية" },
  { icon: "💄", text: "أريد إطلاق حملة لمنتجات مكياج جديدة" },
  { icon: "🏪", text: "أريد حملة ترويجية لمتجر إلكتروني" },
  { icon: "🎯", text: "أريد حملة توعية بعلامتي التجارية" },
];

// Steps that open the Dialog
const DIALOG_STEPS: WizardStep[] = [
  "product_image",
  "generating",
  "creative_review",
  "content_plan",
  "budget_review",
  "preview",
  "confirmed",
];

// Progress steps shown in Dialog header
const PROGRESS_STEPS: { step: WizardStep; label: string }[] = [
  { step: "creative_review", label: "مراجعة الصور" },
  { step: "budget_review",   label: "خطة المحتوى" },
  { step: "preview",         label: "معاينة الحملة" },
  { step: "confirmed",       label: "تم الإطلاق" },
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
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [planError, setPlanError]         = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  const scrollRef          = useRef<HTMLDivElement>(null);
  const textareaRef        = useRef<HTMLTextAreaElement>(null);
  const fileInputRef       = useRef<HTMLInputElement>(null);
  const productImageRef    = useRef<HTMLInputElement>(null);

  // tRPC
  const createWorkflow          = trpc.campaignWorkflow.create.useMutation();
  const chatMutation            = trpc.campaignWorkflow.chat.useMutation();
  const uploadLogoMutation      = trpc.campaignWorkflow.uploadLogo.useMutation();
  const uploadProductImageMut   = trpc.campaignWorkflow.uploadProductImage.useMutation();
  const generateCreatives       = trpc.campaignWorkflow.generateCreatives.useMutation();
  const generatePlanMutation    = trpc.campaignWorkflow.generateContentPlan.useMutation();
  const moveToPreview           = trpc.campaignWorkflow.moveToPreview.useMutation();
  const confirmMutation         = trpc.campaignWorkflow.confirm.useMutation();

  const { data: creativesData, refetch: refetchCreatives } = trpc.campaignWorkflow.getCreatives.useQuery(
    { workflowId: workflowId! },
    {
      enabled: !!workflowId && DIALOG_STEPS.includes(currentStep),
      staleTime: 5000,
    }
  );
  const { data: contentPlanData, refetch: refetchPlan } = trpc.campaignWorkflow.getContentPlan.useQuery(
    { workflowId: workflowId! },
    {
      enabled: !!workflowId && (currentStep === "budget_review" || currentStep === "preview" || currentStep === "confirmed"),
      staleTime: 5000,
    }
  );
  const { data: workflowHistory } = trpc.campaignWorkflow.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: !!user, staleTime: 30000 }
  );

  // Poll generation progress while generating
  const { data: genProgress } = trpc.campaignWorkflow.getGenerationProgress.useQuery(
    { workflowId: workflowId!, expectedCount: brief.platforms?.length ?? 4 },
    {
      enabled: !!workflowId && currentStep === "generating" && isGenerating,
      refetchInterval: 3000,
    }
  );

  // Open dialog when step requires it
  useEffect(() => {
    if (DIALOG_STEPS.includes(currentStep)) {
      setDialogOpen(true);
    }
  }, [currentStep]);

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

  // Auto-scroll chat
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
    const result = await createWorkflow.mutateAsync({ workspaceId: activeWorkspace?.id });
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

      if (result.step && result.step !== currentStep) {
        setCurrentStep(result.step as WizardStep);
      }

      if (assistantMsg.data && typeof assistantMsg.data === "object") {
        const data = assistantMsg.data as Record<string, unknown>;
        if (data.readyToGenerate) {
          // Go to product_image step first (Dialog will open)
          setCurrentStep("product_image");
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
    setDialogOpen(true);

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

      const freshCreatives = await refetchCreatives();
      const count = result.count ?? 0;

      const doneMsg: WizardMessage = {
        role: "assistant",
        content: `تم توليد ${count} صورة إعلانية! 🎨\n\nراجع الصور في النافذة وافق على ما يناسبك.`,
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
      setDialogOpen(false);
    } finally {
      setIsGenerating(false);
    }
  }, [generateCreatives, refetchCreatives]);

  // ── Handle product image upload ──────────────────────────────────────────
  const handleProductImageUpload = useCallback(async (file: File | null) => {
    if (!workflowId) return;
    if (file) {
      if (!file.type.startsWith("image/")) { toast.error("يرجى رفع صورة صحيحة"); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 10MB"); return; }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        try {
          await uploadProductImageMut.mutateAsync({ workflowId, imageBase64: base64, mimeType: file.type });
          toast.success("تم رفع صورة المنتج بنجاح! ✅");
          void triggerGeneration(workflowId);
        } catch {
          toast.error("فشل رفع الصورة");
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Skip — go directly to generation
      void triggerGeneration(workflowId);
    }
  }, [workflowId, uploadProductImageMut, triggerGeneration]);

  // ── Handle logo upload ────────────────────────────────────────────────────
  const handleLogoUpload = useCallback(async (file: File) => {
    if (!workflowId) return;
    if (!file.type.startsWith("image/")) { toast.error("يرجى رفع صورة PNG أو JPEG"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الشعار يجب أن يكون أقل من 5MB"); return; }

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

  // ── Handle creative approval ──────────────────────────────────────────────
  const handleApprovalChange = useCallback((creativeId: string, approved: boolean) => {
    setCreatives(prev => prev.map(c =>
      c.id === creativeId ? { ...c, approved, status: approved ? "approved" : "rejected" } : c
    ));
  }, []);

  // ── Proceed to content plan ───────────────────────────────────────────────
  const handleProceedToContentPlan = useCallback(async () => {
    if (!workflowId) return;
    setIsGeneratingPlan(true);
    setPlanError(null);
    setRevealedCount(0);

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
      const planItems = result.plan.map((item: Record<string, unknown>) => ({
        id: String(Math.random()),
        platform: String(item.platform),
        postDate: String(item.postDate),
        postTime: String(item.postTime),
        caption: String(item.caption),
        hashtags: (item.hashtags as string[]) ?? [],
        status: "draft",
      }));
      setContentPlan(planItems);
      setCurrentStep("budget_review");
      // Staggered reveal: show items one by one every 200ms
      let count = 0;
      const interval = setInterval(() => {
        count += 1;
        setRevealedCount(count);
        if (count >= planItems.length) clearInterval(interval);
      }, 200);
      await refetchPlan();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل إعداد خطة المحتوى";
      setPlanError(msg);
      setCurrentStep("creative_review"); // Go back so user can retry
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
      // Close dialog after a short delay
      setTimeout(() => setDialogOpen(false), 1500);
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
    // Open dialog if workflow is in a dialog step
    if (DIALOG_STEPS.includes(wf.step as WizardStep)) {
      setDialogOpen(true);
    }
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
    setDialogOpen(false);
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

      {/* Main Content — Chat Only */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">

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
              <>
                {DIALOG_STEPS.includes(currentStep) && (
                  <button
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all border border-red-200"
                  >
                    <Sparkles className="w-3 h-3" />
                    عرض الحملة
                  </button>
                )}
                <button
                  onClick={handleNewCampaign}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  حملة جديدة
                </button>
              </>
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

        {/* ── Chat ── */}
        {isInChat && (
          <div className="flex-1 flex flex-col overflow-hidden">
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
        )}
      </div>

      {/* ── Workflow Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        // Only allow closing if not generating
        if (!isGenerating && !isGeneratingPlan) setDialogOpen(open);
      }}>
        <DialogContent
          className="max-w-4xl w-full p-0 gap-0 overflow-hidden"
          style={{ maxHeight: "90vh" }}
        >
          {/* Dialog Header with Progress */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}>
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                </div>
                <DialogTitle className="text-sm font-semibold text-gray-800 m-0">
                  {STEP_LABELS[currentStep] ?? "Marketing Workflow"}
                </DialogTitle>
              </div>
              {!isGenerating && !isGeneratingPlan && (
                <button
                  onClick={() => setDialogOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress Steps */}
            <WizardDialogProgress currentStep={currentStep} />
          </div>

          {/* Dialog Body */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(90vh - 130px)" }}>

            {/* Product Image Upload Step */}
            {currentStep === "product_image" && !isGenerating && (
              <ProductImageStep
                onUpload={handleProductImageUpload}
                isUploading={uploadProductImageMut.isPending}
                productImageRef={productImageRef}
              />
            )}

            {/* Generating — with real progress bar */}
            {(currentStep === "generating" || isGenerating) && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)", boxShadow: "0 0 40px rgba(220,38,38,0.3)" }}>
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">جاري توليد الصور الإعلانية</h3>
                <p className="text-gray-500 text-sm text-center max-w-sm mb-6">
                  يتم توليد صورة لكل منصة بشكل متوازٍ مع إضافة شعارك تلقائياً.
                  <br />قد يستغرق هذا 30-60 ثانية.
                </p>
                {/* Real-time progress bar */}
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>الصور المُولَّدة</span>
                    <span className="font-semibold text-red-600">
                      {genProgress?.generated ?? 0} / {genProgress?.total ?? (brief.platforms?.length ?? 4)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.round(((genProgress?.generated ?? 0) / (genProgress?.total ?? (brief.platforms?.length ?? 4))) * 100)}%`,
                        minWidth: genProgress?.generated ? "8%" : "0%",
                      }}
                    />
                  </div>
                  <div className="flex gap-1.5 justify-center mt-4">
                    {Array.from({ length: genProgress?.total ?? (brief.platforms?.length ?? 4) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full transition-all duration-500",
                          i < (genProgress?.generated ?? 0)
                            ? "bg-red-500 scale-110"
                            : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* In-Dialog Error Banner */}
            {planError && currentStep === "creative_review" && (
              <div className="mx-5 mt-4 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 mb-0.5">فشل إعداد خطة المحتوى</p>
                  <p className="text-xs text-red-600 mb-3 line-clamp-2">
                    {planError.includes("Atlas") ? "حدث خطأ في توليد المحتوى بالذكاء الاصطناعي." : planError}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => { setPlanError(null); void handleProceedToContentPlan(); }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3"
                  >
                    حاول مجدداً
                  </Button>
                </div>
              </div>
            )}

            {/* Creative Review */}
            {currentStep === "creative_review" && !isGenerating && (
              <div className="p-5">
                <CreativeGrid
                  workflowId={workflowId!}
                  creatives={creatives}
                  onApprovalChange={handleApprovalChange}
                  onRegenerateRequest={() => void triggerGeneration(workflowId!)}
                  onProceed={handleProceedToContentPlan}
                  isGenerating={isGeneratingPlan}
                />
              </div>
            )}

            {/* Content Plan loading */}
            {currentStep === "content_plan" && isGeneratingPlan && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)", boxShadow: "0 0 40px rgba(220,38,38,0.3)" }}>
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">جاري إعداد خطة المحتوى</h3>
                <p className="text-gray-500 text-sm text-center max-w-sm">
                  يتم تحليل الجمهور المستهدف وتوزيع الميزانية وإعداد جدول النشر...
                </p>
              </div>
            )}

            {/* Budget Review */}
            {currentStep === "budget_review" && !isGeneratingPlan && (
              <div className="p-5">
                <ContentPlanView
                  items={contentPlan}
                  budgetAllocation={budgetAllocation}
                  insights={insights}
                  currency={brief.currency ?? "SAR"}
                  totalBudget={brief.budget ?? 0}
                  onProceed={handleProceedToPreview}
                  revealedCount={revealedCount}
                />
              </div>
            )}

            {/* Preview */}
            {(currentStep === "preview" || currentStep === "confirmed") && (
              <div className="p-5">
                <CampaignPreview
                  brief={brief}
                  approvedCreatives={approvedCreatives}
                  contentPlan={contentPlan}
                  budgetAllocation={budgetAllocation}
                  onConfirm={handleConfirm}
                  isConfirming={isConfirming}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

// ─── Dialog Progress Bar ──────────────────────────────────────────────────────
function WizardDialogProgress({ currentStep }: { currentStep: WizardStep }) {
  const currentIdx = PROGRESS_STEPS.findIndex(s => s.step === currentStep);
  // Map generating → creative_review for progress display
  const displayIdx = currentStep === "generating" || currentStep === "content_plan"
    ? 0
    : currentIdx;

  return (
    <div className="flex items-center gap-0">
      {PROGRESS_STEPS.map((s, idx) => {
        const isCompleted = idx < displayIdx;
        const isCurrent   = idx === displayIdx;

        return (
          <div key={s.step} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                isCompleted
                  ? "bg-red-500 text-white"
                  : isCurrent
                    ? "bg-red-500 text-white ring-4 ring-red-100"
                    : "bg-gray-100 text-gray-400 border border-gray-200",
              )}>
                {isCompleted ? "✓" : idx + 1}
              </div>
              <span className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                isCurrent || isCompleted ? "text-red-600" : "text-gray-400",
              )}>
                {s.label}
              </span>
            </div>
            {idx < PROGRESS_STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 mb-4 transition-all duration-500",
                isCompleted ? "bg-red-400" : "bg-gray-200",
              )} />
            )}
          </div>
        );
      })}
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

// ─── Product Image Upload Step ────────────────────────────────────────────────
function ProductImageStep({
  onUpload,
  isUploading,
  productImageRef,
}: {
  onUpload: (file: File | null) => void;
  isUploading: boolean;
  productImageRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFileChange(file);
  };

  return (
    <div className="p-6 flex flex-col items-center gap-6" dir="rtl">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}>
          <ImageIcon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">هل لديك صورة للمنتج؟</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          رفع صورة المنتج يُحسّن جودة الصور الإعلانية المُولَّدة بشكل كبير.
          يمكنك تخطي هذه الخطوة إذا أردت.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => productImageRef.current?.click()}
        className={cn(
          "w-full max-w-sm h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200",
          isDragging ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-red-300 hover:bg-gray-50",
          preview ? "border-red-300 bg-red-50/30" : "",
        )}
      >
        {preview ? (
          <img src={preview} alt="preview" className="h-36 w-auto object-contain rounded-xl" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">اسحب الصورة هنا أو انقر للاختيار</p>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP — حتى 10MB</p>
            </div>
          </>
        )}
      </div>

      <input
        ref={productImageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileChange(file);
        }}
      />

      {/* Action Buttons */}
      <div className="flex gap-3 w-full max-w-sm">
        <Button
          onClick={() => onUpload(selectedFile)}
          disabled={isUploading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          {isUploading ? (
            <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الرفع...</>
          ) : selectedFile ? (
            <><Upload className="w-4 h-4 ml-2" />رفع الصورة والمتابعة</>
          ) : (
            <><Sparkles className="w-4 h-4 ml-2" />متابعة بدون صورة</>
          )}
        </Button>
        {selectedFile && (
          <Button
            variant="outline"
            onClick={() => { setSelectedFile(null); setPreview(null); }}
            className="px-4"
          >
            إلغاء
          </Button>
        )}
      </div>

      <button
        onClick={() => onUpload(null)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
      >
        تخطي هذه الخطوة
      </button>
    </div>
  );
}
