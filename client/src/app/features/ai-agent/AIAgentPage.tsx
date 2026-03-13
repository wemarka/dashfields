/**
 * client/src/app/features/ai-agent/AIAgentPage.tsx
 * Dashfields AI — Master Chat interface with Generative UI support.
 * Clean grey/white design, full-height conversational layout.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Plus, Loader2, Sparkles, Copy, Mic, Paperclip,
  ArrowDown, StopCircle,
} from "lucide-react";
import { Textarea } from "@/core/components/ui/textarea";
import { Button } from "@/core/components/ui/button";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/core/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import { Streamdown } from "streamdown";
import { useTranslation } from "react-i18next";
import { trpc } from "@/core/lib/trpc";
import { GenerativeUIRenderer } from "./GenerativeUIRenderer";
import { parseUIBlocks } from "./types";
import type { ChatMessage, ChatSession, UIBlock, ToolStatus } from "./types";

// ─── Local Storage ─────────────────────────────────────────────────────────
const STORAGE_KEY        = "dashfields_ai_sessions";
const ACTIVE_SESSION_KEY = "dashfields_ai_active_session";
const MAX_LOCAL          = 10;

function loadActiveSessionId(): string | null {
  try { return localStorage.getItem(ACTIVE_SESSION_KEY); } catch { return null; }
}
function saveActiveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id);
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch { /* quota */ }
}
function loadLocal(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveLocal(sessions: ChatSession[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_LOCAL))); } catch { /* quota */ }
}

export function broadcastSessions(sessions: ChatSession[], activeId: string | null = null) {
  // Defer the event dispatch to avoid setState-during-render errors
  // when called from inside a setState callback
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("ai-sessions-update", { detail: { sessions, activeId } }));
  });
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function AIAgentPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const { user } = useAuth();

  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [input, setInput]                     = useState("");
  const [isLoading, setIsLoading]             = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadActiveSessionId());
  const [sessions, setSessions]               = useState<ChatSession[]>(() => loadLocal());
  const [showScrollBtn, setShowScrollBtn]     = useState(false);
  const [toolStatus, setToolStatus]             = useState<ToolStatus | null>(null);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);

  const isInChat = messages.length > 0;

  // ── tRPC ───────────────────────────────────────────────────────────────────
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(gap > 200);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // ── Auth token ─────────────────────────────────────────────────────────────
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

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage      = { id: Date.now().toString(), role: "user", content: trimmed, timestamp: Date.now() };
    const assistantId               = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", isStreaming: true, timestamp: Date.now() };

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
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        sseBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw) as { content?: string; text?: string; status?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            // Handle status events (tool calling indicators)
            if (parsed.status) {
              if (parsed.status === "thinking") {
                setToolStatus({ type: "thinking" });
              } else if (parsed.status.startsWith("tool:")) {
                const toolName = parsed.status.slice(5);
                setToolStatus({ type: "tool", toolName });
              }
              continue;
            }
            // Handle content chunks (new format) or text chunks (legacy format)
            const chunk = parsed.content ?? parsed.text;
            if (chunk) {
              setToolStatus(null); // Clear tool status when content starts flowing
              accumulated += chunk;
              const finalAcc = accumulated;
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: finalAcc } : m));
            }
          } catch { /* partial JSON */ }
        }
      }
      setToolStatus(null);

      // Parse UI blocks from the final content
      const { blocks } = parseUIBlocks(accumulated);

      const finalMessages: ChatMessage[] = [
        ...prevMessages,
        userMsg,
        { id: assistantId, role: "assistant", content: accumulated, uiBlocks: blocks.length > 0 ? blocks : undefined, timestamp: Date.now() },
      ];

      if (currentSessionId) {
        const updatedSession: ChatSession = {
          id:        currentSessionId,
          title:     prevMessages.length === 0 ? (trimmed.slice(0, 45) + (trimmed.length > 45 ? "…" : "")) : (sessions.find((s) => s.id === currentSessionId)?.title ?? trimmed.slice(0, 45)),
          preview:   accumulated.slice(0, 65),
          timestamp: Date.now(),
          messages:  finalMessages,
        };
        persistSession(updatedSession);

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

      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false, uiBlocks: blocks.length > 0 ? blocks : undefined } : m));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(t("aiAgent.error"));
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, input, isLoading, activeSessionId, sessions, user, getToken, persistSession]);

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) => prev.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m));
  }, []);

  const handleChipClick = useCallback((chip: string) => {
    void sendMessage(chip);
  }, [sendMessage]);

  const handleActionClick = useCallback((action: string) => {
    void sendMessage(action);
  }, [sendMessage]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── Custom events from sidebar ─────────────────────────────────────────────
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

  // ── Suggested prompts for empty state ──────────────────────────────────────
  const suggestions = [
    t("aiAgent.suggestion1", "Create a new campaign"),
    t("aiAgent.suggestion2", "Analyze my ad performance"),
    t("aiAgent.suggestion3", "Suggest content ideas"),
    t("aiAgent.suggestion4", "Optimize my budget"),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#faf9f7] relative overflow-hidden">

      {/* ── Empty State ── */}
      {!isInChat && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Greeting */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 mb-5 shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              {t("aiAgent.greeting", { name: firstName })}
            </h1>
            <p className="text-gray-500 text-[15px] max-w-md mx-auto leading-relaxed">
              {t("aiAgent.subtitle")}
            </p>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-8 max-w-xl">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => void sendMessage(s)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  "border border-gray-200 bg-white text-gray-600",
                  "hover:border-gray-300 hover:shadow-sm hover:text-gray-800",
                  "active:scale-[0.97]",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="w-full max-w-2xl">
            <ChatInput
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              onSend={() => void sendMessage(input)}
              onKeyDown={handleKeyDown}
              onStop={handleStop}
              textareaRef={textareaRef}
              isRtl={isRtl}
              t={t}
            />
          </div>
        </div>
      )}

      {/* ── Chat State ── */}
      {isInChat && (
        <>
          {/* Chat header */}
          <div className={cn(
            "flex items-center justify-between px-5 py-3 shrink-0",
            "border-b border-gray-200/60 bg-white/80 backdrop-blur-md",
            isRtl ? "flex-row-reverse" : "",
          )}>
            <div className={cn("flex items-center gap-2.5", isRtl ? "flex-row-reverse" : "")}>
              <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Dashfields AI</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className={cn(
                "text-xs text-gray-500 hover:text-gray-800 gap-1.5",
                isRtl ? "flex-row-reverse" : "",
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("aiAgent.newChat")}
            </Button>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  t={t}
                  isRtl={isRtl}
                  onChipClick={handleChipClick}
                  onAction={handleActionClick}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && <ThinkingIndicator />}
              {isLoading && toolStatus && <ToolStatusIndicator status={toolStatus} />}
              <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
              <button
                onClick={scrollToBottom}
                className={cn(
                  "fixed bottom-28 left-1/2 -translate-x-1/2 z-20",
                  "w-9 h-9 rounded-full bg-white border border-gray-200 shadow-lg",
                  "flex items-center justify-center",
                  "hover:bg-gray-50 transition-all",
                )}
              >
                <ArrowDown className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 shrink-0 bg-gradient-to-t from-[#faf9f7] via-[#faf9f7] to-transparent">
            <div className="max-w-2xl mx-auto">
              <ChatInput
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                onSend={() => void sendMessage(input)}
                onKeyDown={handleKeyDown}
                onStop={handleStop}
                textareaRef={textareaRef}
                isRtl={isRtl}
                t={t}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Chat Input ────────────────────────────────────────────────────────────
function ChatInput({ input, setInput, isLoading, onSend, onKeyDown, onStop, textareaRef, isRtl, t }: {
  input: string; setInput: (v: string) => void; isLoading: boolean;
  onSend: () => void; onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onStop: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>; isRtl: boolean; t: (k: string) => string;
}) {
  const hasText = input.trim().length > 0;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl transition-all duration-200",
        "border border-gray-200 bg-white",
        "hover:border-gray-300",
        "focus-within:border-gray-400 focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]",
      )}
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
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
          "resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] text-gray-800",
          "placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0",
          "min-h-[28px] max-h-[200px] leading-relaxed",
          isRtl ? "text-right" : "text-left",
        )}
        style={{ boxShadow: "none" }}
      />

      {/* Bottom bar */}
      <div className={cn("flex items-center justify-between px-3 pb-3 pt-1", isRtl ? "flex-row-reverse" : "")}>
        {/* Left icons */}
        <div className={cn("flex items-center gap-0.5", isRtl ? "flex-row-reverse" : "")}>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Attach file"
            onClick={() => toast.info("Feature coming soon")}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Voice input"
            onClick={() => toast.info("Feature coming soon")}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Send / Stop button */}
        {isLoading ? (
          <button
            onClick={onStop}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
              "bg-gray-900 text-white hover:bg-gray-800 active:scale-95",
            )}
          >
            <StopCircle className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!hasText}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
              hasText
                ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-95"
                : "bg-gray-100 text-gray-300 cursor-not-allowed",
            )}
          >
            <Send className={cn("w-4 h-4", isRtl ? "rotate-180" : "")} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, t, isRtl, onChipClick, onAction }: {
  msg: ChatMessage; t: (k: string) => string; isRtl: boolean;
  onChipClick?: (c: string) => void; onAction?: (a: string) => void;
}) {
  const isUser = msg.role === "user";
  const handleCopy = () => { void navigator.clipboard.writeText(msg.content); toast.success(t("aiAgent.copied")); };

  // Parse UI blocks from content (for loaded sessions)
  const { text: cleanText, blocks: parsedBlocks } = parseUIBlocks(msg.content);
  const uiBlocks: UIBlock[] = msg.uiBlocks ?? parsedBlocks;
  const displayText = msg.uiBlocks ? cleanText : msg.content;

  if (isUser) {
    return (
      <div className={cn("flex", isRtl ? "justify-start" : "justify-end")}>
        <div
          className={cn(
            "max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
            "bg-gray-900 text-white",
            isRtl ? "rounded-bl-md" : "rounded-br-md",
          )}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className={cn("flex items-start gap-3 group", isRtl ? "flex-row-reverse" : "")}>
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center mt-0.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Text content */}
        <div className={cn(
          "rounded-2xl text-sm text-gray-800",
          isRtl ? "rounded-tr-md" : "rounded-tl-md",
        )}>
          {displayText ? (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:text-gray-800 prose-blockquote:border-l-gray-300 prose-blockquote:text-gray-500">
              <Streamdown>{displayText}</Streamdown>
            </div>
          ) : (
            <ThinkingDots />
          )}
        </div>

        {/* Generative UI blocks */}
        {uiBlocks.length > 0 && !msg.isStreaming && (
          <GenerativeUIRenderer
            blocks={uiBlocks}
            onChipClick={onChipClick}
            onAction={onAction}
          />
        )}

        {/* Action bar */}
        {displayText && !msg.isStreaming && (
          <div className={cn(
            "flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isRtl ? "flex-row-reverse" : "",
          )}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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

// ─── Thinking Indicator ────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400"
          style={{ animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center mt-0.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-gray-100">
        <ThinkingDots />
      </div>
    </div>
  );
}

// ── Tool Status Indicator ─────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  get_campaigns: "Fetching campaigns",
  get_campaign_metrics: "Loading metrics",
  get_social_accounts: "Checking accounts",
  get_posts: "Loading posts",
  get_marketing_overview: "Analyzing overview",
  create_campaign: "Creating campaign",
  generate_ad_image: "Generating image",
  get_brand_profile: "Loading brand profile",
};

function ToolStatusIndicator({ status }: { status: { type: string; toolName?: string } }) {
  const label = status.type === "thinking"
    ? "Analyzing your data..."
    : TOOL_LABELS[status.toolName ?? ""] ?? `Running ${status.toolName ?? "tool"}...`;

  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center mt-0.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-md bg-white border border-gray-100">
        <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
    </div>
  );
}
