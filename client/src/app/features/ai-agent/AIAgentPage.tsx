/**
 * client/src/app/features/ai-agent/AIAgentPage.tsx
 * Dashfields AI Marketing Agent — main page replacing the Dashboard.
 * Full-screen chat interface with streaming responses and marketing context.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Sparkles, BarChart3, Megaphone, Image, TrendingUp,
  RotateCcw, Copy, ThumbsUp, Loader2, Bot, User,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/textarea";
import { ScrollArea } from "@/core/components/ui/scroll-area";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/core/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

// ─── Quick suggestion chips ───────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  {
    icon: BarChart3,
    label: "حلّل أداء حملاتي",
    prompt: "حلّل أداء حملاتي الإعلانية الحالية وأخبرني ما هي نقاط القوة والضعف، وما الذي يجب تحسينه؟",
    color: "text-blue-500",
    bg: "bg-blue-500/8 hover:bg-blue-500/14",
    border: "border-blue-500/20",
  },
  {
    icon: Megaphone,
    label: "أنشئ حملة إعلانية",
    prompt: "أريد إنشاء حملة إعلانية جديدة. ساعدني في تحديد الهدف والجمهور والميزانية والمنصة المناسبة.",
    color: "text-violet-500",
    bg: "bg-violet-500/8 hover:bg-violet-500/14",
    border: "border-violet-500/20",
  },
  {
    icon: Image,
    label: "ولّد نص إعلاني",
    prompt: "اكتب لي نصاً إعلانياً احترافياً (Headline + Body + CTA) لمنتج أو خدمة أصفها لك.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/8 hover:bg-emerald-500/14",
    border: "border-emerald-500/20",
  },
  {
    icon: TrendingUp,
    label: "ابحث عن المنافسين",
    prompt: "ابحث عن استراتيجيات المنافسين في مجال عملي وأخبرني ما هي الترندات الحالية في السوق العربي.",
    color: "text-amber-500",
    bg: "bg-amber-500/8 hover:bg-amber-500/14",
    border: "border-amber-500/20",
  },
];

// ─── Markdown renderer ────────────────────────────────────────────────────────
function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert
      prose-headings:font-semibold prose-headings:text-foreground
      prose-p:text-foreground/90 prose-p:leading-relaxed
      prose-strong:text-foreground prose-strong:font-semibold
      prose-ul:text-foreground/90 prose-ol:text-foreground/90
      prose-li:marker:text-muted-foreground
      prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-blockquote:border-l-brand prose-blockquote:text-muted-foreground
      prose-table:text-sm prose-th:bg-muted/60 prose-th:font-semibold
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIAgentPage() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  // Send message to AI Agent
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText.trim(),
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    // Build conversation history (last 10 messages for context)
    const history = [...messages, userMessage].slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const token = await getToken();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const response = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text !== undefined) {
              accumulated += parsed.text;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: accumulated, isStreaming: true }
                    : m
                )
              );
            }
          } catch (parseErr) {
            // Skip malformed chunks
          }
        }
      }

      // Mark streaming as done
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[AIAgent] Error:", err);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.", isStreaming: false }
            : m
        )
      );
      toast.error("حدث خطأ في الاتصال بالـ AI");
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }, [messages, isLoading, getToken]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleSuggestion = (prompt: string) => {
    void sendMessage(prompt);
  };

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content);
    toast.success("تم النسخ");
  };

  const handleClear = () => {
    setMessages([]);
    if (abortRef.current) abortRef.current.abort();
    setIsLoading(false);
  };

  const isEmptyState = messages.length === 0;
  const userName = user?.name?.split(" ")[0] ?? "هناك";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-foreground">Dashfields AI</h1>
            <p className="text-[11px] text-muted-foreground">Marketing Agent</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground gap-1.5 text-[12px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            محادثة جديدة
          </Button>
        )}
      </div>

      {/* ── Messages / Empty State ──────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        {isEmptyState ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 max-w-2xl mx-auto">
            {/* Greeting */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center mb-5 shadow-sm">
              <Sparkles className="w-7 h-7 text-brand" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              مرحباً {userName}!
            </h2>
            <p className="text-muted-foreground text-center text-[14px] leading-relaxed mb-8 max-w-md">
              أنا Dashfields AI، مساعدك الذكي للتسويق الرقمي. يمكنني تحليل حملاتك، إنشاء إعلانات، بحث المنافسين، وتوليد محتوى إبداعي.
            </p>

            {/* Quick suggestions */}
            <div className="w-full grid grid-cols-2 gap-3">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.prompt)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border text-right transition-all duration-150",
                    "hover:shadow-sm active:scale-[0.98]",
                    s.bg, s.border
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5", s.color)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-medium text-foreground/80 leading-snug">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground/60 mt-6">
              اكتب بالعربي أو الإنجليزي • Enter للإرسال • Shift+Enter لسطر جديد
            </p>
          </div>
        ) : (
          /* ── Messages ── */
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-brand/10 text-brand"
                    : "bg-muted text-muted-foreground"
                )}>
                  {msg.role === "user"
                    ? <User className="w-4 h-4" />
                    : <Bot className="w-4 h-4" />
                  }
                </div>

                {/* Bubble */}
                <div className={cn(
                  "flex-1 max-w-[85%]",
                  msg.role === "user" ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-brand text-white rounded-tr-sm ml-auto"
                      : "bg-muted/60 border border-border/40 rounded-tl-sm"
                  )}>
                    {msg.role === "user" ? (
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <>
                        {msg.content ? (
                          <MessageContent content={msg.content} />
                        ) : null}
                        {msg.isStreaming && (
                          <span className="inline-flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions (assistant only, after streaming) */}
                  {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                    <div className="flex items-center gap-1 mt-1.5 px-1">
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className="p-1.5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-colors"
                        title="نسخ"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-md text-muted-foreground/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                        title="مفيد"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Input Area ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/40 bg-background px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Inline quick chips (visible when chat is active) */}
          {!isEmptyState && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.prompt)}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium whitespace-nowrap transition-all",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    s.bg, s.border, s.color
                  )}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input box */}
          <form onSubmit={handleSubmit} className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك أو طلبك هنا... (مثال: أريد حملة إعلانية لمنتج عطر رجالي في السعودية)"
              disabled={isLoading}
              rows={1}
              className={cn(
                "resize-none pr-4 pl-14 py-3.5 rounded-xl border-border/60",
                "text-[14px] leading-relaxed min-h-[52px] max-h-[200px]",
                "focus-visible:ring-1 focus-visible:ring-brand/40",
                "disabled:opacity-60 bg-muted/30",
                "scrollbar-thin"
              )}
              style={{ direction: "rtl" }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className={cn(
                "absolute left-2 bottom-2 w-9 h-9 rounded-lg",
                "bg-brand hover:bg-brand/90 text-white",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "transition-all duration-150"
              )}
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
            Dashfields AI يعمل بالذكاء الاصطناعي — تحقق دائماً من المعلومات المهمة
          </p>
        </div>
      </div>
    </div>
  );
}
