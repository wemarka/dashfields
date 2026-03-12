/**
 * client/src/app/features/ai-agent/AIAgentPage.tsx
 * Dashfields AI Marketing Agent — red-black gradient, Lovable-style input.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, Loader2, Bot, Sparkles, Copy, Mic, MessageSquare } from "lucide-react";
import { Textarea } from "@/core/components/ui/textarea";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/core/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { trpc } from "@/core/lib/trpc";

// ─── Types ──────────────────────────────────────────────────────────────────
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
  timestamp: number;
  messages: ChatMessage[];
}

const STORAGE_KEY        = "dashfields_ai_sessions";
const ACTIVE_SESSION_KEY = "dashfields_ai_active_session";
const MAX_LOCAL          = 10;

function loadActiveSessionId(): string | null {
  try { return localStorage.getItem(ACTIVE_SESSION_KEY); }
  catch { return null; }
}
function saveActiveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id);
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch { /* quota */ }
}

function loadLocal(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
function saveLocal(sessions: ChatSession[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_LOCAL))); }
  catch { /* quota */ }
}

export function broadcastSessions(sessions: ChatSession[], activeId: string | null = null) {
  window.dispatchEvent(new CustomEvent("ai-sessions-update", { detail: { sessions, activeId } }));
}

// ─── Markdown renderer ──────────────────────────────────────────────────────
function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:font-semibold prose-headings:text-white/90
      prose-p:text-white/80 prose-p:leading-relaxed
      prose-strong:text-white prose-strong:font-semibold
      prose-ul:text-white/80 prose-ol:text-white/80
      prose-li:marker:text-white/40
      prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:text-white/90
      prose-blockquote:border-l-red-400 prose-blockquote:text-white/60
      prose-table:text-sm prose-th:bg-white/10 prose-th:font-semibold
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AIAgentPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const { user } = useAuth();

  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [input, setInput]                     = useState("");
  const [isLoading, setIsLoading]             = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadActiveSessionId());
  const [sessions, setSessions]               = useState<ChatSession[]>(() => loadLocal());

  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  const isInChat = messages.length > 0;

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const saveConversation   = trpc.aiConversations.save.useMutation();
  const deleteConversation = trpc.aiConversations.delete.useMutation();
  const generateTitle      = trpc.aiConversations.generateTitle.useMutation();
  const { data: remoteSessionsData } = trpc.aiConversations.list.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!remoteSessionsData) return;
    const remote = remoteSessionsData as ChatSession[];
    if (remote.length > 0) {
      setSessions(remote);
      saveLocal(remote);
      broadcastSessions(remote, activeSessionId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSessionsData]);

  useEffect(() => {
    saveActiveSessionId(activeSessionId);
    broadcastSessions(sessions, activeSessionId);
  }, [sessions, activeSessionId]);

  useEffect(() => {
    const local = loadLocal();
    if (local.length > 0) broadcastSessions(local, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      let sess = data.session;
      if (sess) {
        const expiresAt = sess.expires_at ?? 0;
        if (expiresAt - Math.floor(Date.now() / 1000) < 60) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          sess = refreshed.session;
        }
      }
      return sess?.access_token ?? null;
    } catch { return null; }
  }, []);

  const persistSession = useCallback((session: ChatSession) => {
    setSessions((prev) => {
      const without = prev.filter((s) => s.id !== session.id);
      const updated = [session, ...without].slice(0, MAX_LOCAL);
      saveLocal(updated);
      return updated;
    });
    if (user) saveConversation.mutate(session);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage      = { id: Date.now().toString(), role: "user", content: trimmed };
    const assistantId               = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", isStreaming: true };

    const prevMessages = messages;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    let currentSessionId = activeSessionId;
    if (prevMessages.length === 0) {
      const newId = crypto.randomUUID();
      currentSessionId = newId;
      setActiveSessionId(newId);
      persistSession({
        id: newId,
        title:     trimmed.slice(0, 45) + (trimmed.length > 45 ? "…" : ""),
        preview:   trimmed.slice(0, 65),
        timestamp: Date.now(),
        messages:  [],
      });
    }

    try {
      const token = await getToken();
      const ctrl  = new AbortController();
      abortRef.current = ctrl;

      const history = [...prevMessages, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));

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

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw) as { content?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              accumulated += parsed.content;
              const finalAcc = accumulated;
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: finalAcc } : m));
            }
          } catch { /* partial JSON */ }
        }
      }

      const finalMessages = [...prevMessages, userMsg, { id: assistantId, role: "assistant" as const, content: accumulated }];
      if (currentSessionId) {
        const updatedSession: ChatSession = {
          id:        currentSessionId,
          title:     prevMessages.length === 0 ? (trimmed.slice(0, 45) + (trimmed.length > 45 ? "…" : "")) : (sessions.find((s) => s.id === currentSessionId)?.title ?? trimmed.slice(0, 45)),
          preview:   accumulated.slice(0, 65),
          timestamp: Date.now(),
          messages:  finalMessages,
        };
        persistSession(updatedSession);

        // Generate AI title after first exchange
        if (prevMessages.length === 0 && user) {
          generateTitle.mutate(
            { userMessage: trimmed, assistantReply: accumulated.slice(0, 1000) },
            {
              onSuccess: (result) => {
                const title = result?.title;
                if (title) {
                  setSessions((prev) => {
                    const updated = prev.map((s) => s.id === currentSessionId ? { ...s, title } : s);
                    saveLocal(updated);
                    broadcastSessions(updated, currentSessionId);
                    return updated;
                  });
                }
              },
            },
          );
        }
      }

      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(t("aiAgent.error"));
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, input, isLoading, activeSessionId, sessions, user, getToken, persistSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(input); }
  }, [input, sendMessage]);

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setActiveSessionId(null);
  }, []);

  const handleLoadSession = useCallback((session: ChatSession) => {
    setMessages(session.messages);
    setActiveSessionId(session.id);
    setInput("");
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveLocal(updated);
      broadcastSessions(updated, activeSessionId === sessionId ? null : activeSessionId);
      return updated;
    });
    if (activeSessionId === sessionId) handleNewChat();
        if (user) deleteConversation.mutate({ id: sessionId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, user]);

  useEffect(() => {
    const loadHandler   = (e: Event) => handleLoadSession((e as CustomEvent<ChatSession>).detail);
    const deleteHandler = (e: Event) => handleDeleteSession((e as CustomEvent<string>).detail);
    const newChatHandler = () => handleNewChat();
    window.addEventListener("ai-load-session",   loadHandler);
    window.addEventListener("ai-delete-session", deleteHandler);
    window.addEventListener("ai-new-chat",        newChatHandler);
    return () => {
      window.removeEventListener("ai-load-session",   loadHandler);
      window.removeEventListener("ai-delete-session", deleteHandler);
      window.removeEventListener("ai-new-chat",        newChatHandler);
    };
  }, [handleLoadSession, handleDeleteSession, handleNewChat]);

  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Red-Black Gradient Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0505 30%, #2d0808 55%, #1a0000 75%, #0d0d0d 100%)",
        }}
      />

      {/* Subtle noise/grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* Glow orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.18) 0%, transparent 65%)",
          top: "-15%", left: "20%",
          animation: "pulse 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(185,28,28,0.12) 0%, transparent 65%)",
          bottom: "0%", right: "15%",
          animation: "pulse 8s ease-in-out infinite",
          animationDelay: "2s",
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Empty State ── */}
        {!isInChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 overflow-y-auto">
            <div className="text-center mb-10 animate-fade-in">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)", boxShadow: "0 0 40px rgba(220,38,38,0.4)" }}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[2.2rem] font-bold text-white mb-2 tracking-tight">
                {t("aiAgent.greeting", { name: firstName })}
              </h1>
              <p className="text-white/50 text-[15px]">{t("aiAgent.subtitle")}</p>
            </div>

            {/* Input */}
            <div className="w-full max-w-2xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <InputBox
                input={input} setInput={setInput} isLoading={isLoading}
                onSend={() => void sendMessage(input)} onKeyDown={handleKeyDown}
                textareaRef={textareaRef} isRtl={isRtl} t={t}
              />
            </div>
          </div>
        )}

        {/* ── Chat State ── */}
        {isInChat && (<>
          {/* Chat header */}
          <div className={cn(
            "flex items-center justify-between px-5 py-3 shrink-0 border-b",
            "border-white/[0.06] bg-black/20 backdrop-blur-sm",
            isRtl ? "flex-row-reverse" : "",
          )}>
            <div className={cn("flex items-center gap-2", isRtl ? "flex-row-reverse" : "")}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/80">Dashfields AI</span>
            </div>
            <button
              onClick={handleNewChat}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all",
                isRtl ? "flex-row-reverse" : "",
              )}
            >
              <Plus className="w-3 h-3" />
              {t("aiAgent.newChat")}
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none">
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} t={t} isRtl={isRtl} />)}
              {isLoading && messages[messages.length - 1]?.role === "user" && <ThinkingBubble />}
            </div>
          </div>

          {/* Input */}
          <div className="px-4 pb-4 shrink-0">
            <div className="max-w-2xl mx-auto">
              <InputBox
                input={input} setInput={setInput} isLoading={isLoading}
                onSend={() => void sendMessage(input)} onKeyDown={handleKeyDown}
                textareaRef={textareaRef} isRtl={isRtl} t={t}
              />
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ─── Input Box (Lovable-style) ───────────────────────────────────────────────
function InputBox({ input, setInput, isLoading, onSend, onKeyDown, textareaRef, isRtl, t }: {
  input: string; setInput: (v: string) => void; isLoading: boolean;
  onSend: () => void; onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>; isRtl: boolean; t: (k: string) => string;
}) {
  const hasText = input.trim().length > 0;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl transition-all duration-200",
        "border border-white/10 hover:border-white/20 focus-within:border-red-500/40",
      )}
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Textarea */}
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
          "resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] text-white",
          "placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0",
          "min-h-[28px] max-h-[160px] leading-relaxed",
          isRtl ? "text-right" : "text-left",
        )}
        style={{ boxShadow: "none" }}
      />

      {/* Bottom bar: left icons + send button */}
      <div className={cn("flex items-center justify-between px-3 pb-3 pt-1", isRtl ? "flex-row-reverse" : "")}>
        {/* Left icons */}
        <div className={cn("flex items-center gap-1", isRtl ? "flex-row-reverse" : "")}>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
            title="Attach"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
            title="Conversations"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
            title="Voice"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={!hasText || isLoading}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
            hasText && !isLoading
              ? "text-white hover:scale-105 active:scale-95"
              : "text-white/20 cursor-not-allowed",
          )}
          style={hasText && !isLoading ? {
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
            boxShadow: "0 2px 12px rgba(220,38,38,0.5)",
          } : { background: "rgba(255,255,255,0.06)" }}
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className={cn("w-4 h-4", isRtl ? "rotate-180" : "")} />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, t, isRtl }: { msg: ChatMessage; t: (k: string) => string; isRtl: boolean }) {
  const isUser = msg.role === "user";
  const handleCopy = () => { void navigator.clipboard.writeText(msg.content); toast.success(t("aiAgent.copied")); };

  if (isUser) {
    return (
      <div className={cn("flex animate-fade-in", isRtl ? "justify-start" : "justify-end")}>
        <div
          className={cn("max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed text-white", isRtl ? "rounded-bl-md" : "rounded-br-md")}
          style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", boxShadow: "0 2px 12px rgba(220,38,38,0.3)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 animate-fade-in group", isRtl ? "flex-row-reverse" : "")}>
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mt-0.5"
        style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}
      >
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn("px-4 py-3 rounded-2xl text-sm border border-white/[0.08]", isRtl ? "rounded-tr-md" : "rounded-tl-md")}
          style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
        >
          {msg.content ? <MessageContent content={msg.content} /> : <ThinkingDots />}
        </div>
        {msg.content && !msg.isStreaming && (
          <div className={cn("flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity", isRtl ? "flex-row-reverse" : "")}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
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

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-red-500/70"
          style={{ animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mt-0.5"
        style={{ background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" }}
      >
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-md border border-white/[0.08]"
        style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
      >
        <ThinkingDots />
      </div>
    </div>
  );
}
