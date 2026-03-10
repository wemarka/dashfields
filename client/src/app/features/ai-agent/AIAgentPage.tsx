/**
 * client/src/app/features/ai-agent/AIAgentPage.tsx
 * Dashfields AI Marketing Agent — Full-width, no internal sidebar.
 * Gradient background, floating input, card quick actions.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Plus, BarChart3, Megaphone, Image as ImageIcon,
  TrendingUp, Loader2, Bot, ChevronRight,
  Sparkles, Copy, RotateCcw,
} from "lucide-react";
import { Textarea } from "@/core/components/ui/textarea";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/core/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

// ─── Types ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: ChatMessage[];
}

// Export sessions state so DashboardLayout can access it
// We use a simple event emitter pattern via window events
export function dispatchSessionsUpdate(sessions: ChatSession[]) {
  window.dispatchEvent(new CustomEvent("ai-sessions-update", { detail: sessions }));
}

// ─── Markdown renderer ──────────────────────────────────────────────────────
function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:font-semibold prose-headings:text-gray-900
      prose-p:text-gray-700 prose-p:leading-relaxed
      prose-strong:text-gray-900 prose-strong:font-semibold
      prose-ul:text-gray-700 prose-ol:text-gray-700
      prose-li:marker:text-gray-400
      prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:text-gray-800
      prose-blockquote:border-l-violet-400 prose-blockquote:text-gray-500
      prose-table:text-sm prose-th:bg-gray-50 prose-th:font-semibold
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

// ─── Quick Action Cards ──────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    icon: BarChart3,
    titleKey: "aiAgent.quick.analyze",
    descKey: "aiAgent.quick.analyzeDesc",
    prompt: "Analyze my current campaign performance and give me actionable insights",
    gradient: "from-blue-500/10 to-indigo-500/10",
    iconColor: "text-blue-500",
    border: "border-blue-200/60 hover:border-blue-300",
  },
  {
    icon: Megaphone,
    titleKey: "aiAgent.quick.create",
    descKey: "aiAgent.quick.createDesc",
    prompt: "I want to create a new advertising campaign",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-500",
    border: "border-violet-200/60 hover:border-violet-300",
  },
  {
    icon: ImageIcon,
    titleKey: "aiAgent.quick.generate",
    descKey: "aiAgent.quick.generateDesc",
    prompt: "Generate creative ad copy and visuals for my product",
    gradient: "from-pink-500/10 to-rose-500/10",
    iconColor: "text-pink-500",
    border: "border-pink-200/60 hover:border-pink-300",
  },
  {
    icon: TrendingUp,
    titleKey: "aiAgent.quick.research",
    descKey: "aiAgent.quick.researchDesc",
    prompt: "Research my competitors and current market trends",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-500",
    border: "border-emerald-200/60 hover:border-emerald-300",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AIAgentPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isInChat = messages.length > 0;

  // Broadcast sessions to sidebar
  useEffect(() => {
    dispatchSessionsUpdate(sessions);
  }, [sessions]);

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
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // Get auth token
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      let sess = data.session;
      if (sess) {
        const expiresAt = sess.expires_at ?? 0;
        const nowSecs = Math.floor(Date.now() / 1000);
        if (expiresAt - nowSecs < 60) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          sess = refreshed.session;
        }
      }
      return sess?.access_token ?? null;
    } catch { return null; }
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    const prevMessages = messages;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    // Create session on first message
    if (prevMessages.length === 0) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: trimmed.slice(0, 45) + (trimmed.length > 45 ? "…" : ""),
        preview: trimmed.slice(0, 65),
        timestamp: new Date(),
        messages: [],
      };
      setActiveSession(newSession.id);
      setSessions((prev) => [newSession, ...prev.slice(0, 9)]);
    }

    try {
      const token = await getToken();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const history = [...prevMessages, userMsg].slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
        credentials: "include",
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw) as { content?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              accumulated += parsed.content;
              const snap = accumulated;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: snap, isStreaming: true } : m
                )
              );
            }
          } catch { /* ignore parse errors */ }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(t("aiAgent.error"));
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, getToken, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0 && activeSession) {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession ? { ...s, messages } : s))
      );
    }
    setMessages([]);
    setInput("");
    setActiveSession(null);
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden relative">
      {/* ── Gradient Background ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: isInChat
            ? "linear-gradient(145deg, #f5f7ff 0%, #f0f4ff 40%, #faf8ff 100%)"
            : "linear-gradient(145deg, #c7d2fe 0%, #ddd6fe 25%, #e0e7ff 50%, #ede9fe 70%, #fce7f3 100%)",
        }}
      />

      {/* Animated gradient orbs — empty state only */}
      {!isInChat && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              width: 700, height: 700, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)",
              top: "-10%", left: "5%",
              animation: "pulse 5s ease-in-out infinite",
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              width: 600, height: 600, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 65%)",
              bottom: "5%", right: "10%",
              animation: "pulse 7s ease-in-out infinite",
              animationDelay: "1.5s",
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              width: 450, height: 450, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)",
              top: "50%", left: "55%",
              animation: "pulse 6s ease-in-out infinite",
              animationDelay: "3s",
            }}
          />
        </>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Empty State ─────────────────────────────────────────────── */}
        {!isInChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 overflow-y-auto">
            {/* Greeting */}
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg mb-5">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-[2rem] font-bold text-gray-800 mb-2 tracking-tight">
                {t("aiAgent.greeting", { name: firstName })}
              </h1>
              <p className="text-gray-500 text-[15px]">{t("aiAgent.subtitle")}</p>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xl mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.titleKey}
                  onClick={() => void sendMessage(action.prompt)}
                  className={cn(
                    "group relative flex flex-col items-start gap-2.5 p-4 rounded-2xl text-left",
                    "bg-white/75 backdrop-blur-sm border transition-all duration-200",
                    "hover:bg-white/95 hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]",
                    action.border
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    `bg-gradient-to-br ${action.gradient}`
                  )}>
                    <action.icon className={cn("w-[18px] h-[18px]", action.iconColor)} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800 group-hover:text-gray-900">
                      {t(action.titleKey)}
                    </p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed">
                      {t(action.descKey)}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "absolute top-4 right-4 w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-all",
                    isRtl ? "rotate-180" : "group-hover:translate-x-0.5"
                  )} />
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="w-full max-w-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <InputBox
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                onSend={() => void sendMessage(input)}
                onKeyDown={handleKeyDown}
                textareaRef={textareaRef}
                isRtl={isRtl}
                t={t}
              />
            </div>
          </div>
        )}

        {/* ── Chat State ──────────────────────────────────────────────── */}
        {isInChat && (
          <>
            {/* Chat header */}
            <div className={cn(
              "flex items-center justify-between px-5 py-3 shrink-0",
              "bg-white/50 backdrop-blur-sm border-b border-white/60",
              isRtl ? "flex-row-reverse" : ""
            )}>
              <div className={cn("flex items-center gap-2", isRtl ? "flex-row-reverse" : "")}>
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Dashfields AI</span>
              </div>
              <button
                onClick={handleNewChat}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                  "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 transition-all",
                  isRtl ? "flex-row-reverse" : ""
                )}
              >
                <Plus className="w-3 h-3" />
                {t("aiAgent.newChat")}
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none"
            >
              <div className="max-w-2xl mx-auto space-y-5">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} t={t} isRtl={isRtl} />
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <ThinkingBubble />
                )}
              </div>
            </div>

            {/* Input */}
            <div className="px-4 pb-4 shrink-0">
              <div className="max-w-2xl mx-auto">
                <InputBox
                  input={input}
                  setInput={setInput}
                  isLoading={isLoading}
                  onSend={() => void sendMessage(input)}
                  onKeyDown={handleKeyDown}
                  textareaRef={textareaRef}
                  isRtl={isRtl}
                  t={t}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Input Box ───────────────────────────────────────────────────────────────
function InputBox({
  input, setInput, isLoading, onSend, onKeyDown, textareaRef, isRtl, t,
}: {
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isRtl: boolean;
  t: (key: string) => string;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-3 p-3 rounded-2xl",
        "bg-white/90 backdrop-blur-xl",
        "border border-gray-200/70",
        "shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_4px_32px_rgba(0,0,0,0.12)]",
        "focus-within:border-violet-300/80 focus-within:shadow-[0_4px_32px_rgba(139,92,246,0.15)]",
        "transition-all duration-200",
        isRtl ? "flex-row-reverse" : ""
      )}
    >
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("aiAgent.placeholder")}
        disabled={isLoading}
        rows={1}
        dir={isRtl ? "rtl" : "ltr"}
        className={cn(
          "flex-1 resize-none border-0 bg-transparent p-0 text-sm text-gray-800",
          "placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0",
          "min-h-[24px] max-h-[160px] leading-relaxed",
          isRtl ? "text-right" : "text-left"
        )}
        style={{ boxShadow: "none" }}
      />
      <button
        onClick={onSend}
        disabled={!input.trim() || isLoading}
        className={cn(
          "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
          input.trim() && !isLoading
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        {isLoading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Send className={cn("w-3.5 h-3.5", isRtl ? "rotate-180" : "")} />
        }
      </button>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({
  msg, t, isRtl,
}: {
  msg: ChatMessage;
  t: (key: string) => string;
  isRtl: boolean;
}) {
  const isUser = msg.role === "user";

  const handleCopy = () => {
    void navigator.clipboard.writeText(msg.content);
    toast.success(t("aiAgent.copied"));
  };

  if (isUser) {
    return (
      <div className={cn("flex animate-fade-in", isRtl ? "justify-start" : "justify-end")}>
        <div className={cn(
          "max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
          "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
          isRtl ? "rounded-bl-md" : "rounded-br-md"
        )}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 animate-fade-in group", isRtl ? "flex-row-reverse" : "")}>
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm mt-0.5">
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn(
          "px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-100/80 shadow-sm text-sm",
          isRtl ? "rounded-tr-md" : "rounded-tl-md"
        )}>
          {msg.content ? (
            <MessageContent content={msg.content} />
          ) : (
            <ThinkingDots />
          )}
        </div>

        {/* Copy button */}
        {msg.content && !msg.isStreaming && (
          <div className={cn(
            "flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
            isRtl ? "flex-row-reverse" : ""
          )}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <Copy className="w-3 h-3" />
              {t("aiAgent.copy")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Thinking Dots ───────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400"
          style={{
            animation: "bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Thinking Bubble ─────────────────────────────────────────────────────────
function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm mt-0.5">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/90 backdrop-blur-sm border border-gray-100/80 shadow-sm">
        <ThinkingDots />
      </div>
    </div>
  );
}

// Unused but kept for potential future use
export { RotateCcw };
