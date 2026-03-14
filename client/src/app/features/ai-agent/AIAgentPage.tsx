/**
 * client/src/app/features/ai-agent/AIAgentPage.tsx
 * Dashfields AI — Full-viewport chat interface.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  [Sidebar 260px]  │  [Chat Area — flex-1]            │
 *   │  - New Chat btn   │  - Empty state / Messages        │
 *   │  - Session list   │  - Pinned input bar at bottom    │
 *   └──────────────────────────────────────────────────────┘
 *
 * Design: Dark Neutral (neutral-950) + Brand Red (#E62020)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Plus, Loader2, Sparkles, Copy, Mic, Paperclip,
  ArrowDown, StopCircle, MessageSquare, Trash2, ChevronLeft, ChevronRight,
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
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("ai-sessions-update", { detail: { sessions, activeId } }));
  });
}

// ─── Language detection helper ────────────────────────────────────────────
// Returns 'rtl' if the text is predominantly Arabic/Hebrew, 'ltr' otherwise
function detectDir(text: string): "rtl" | "ltr" {
  if (!text) return "ltr";
  // Count Arabic/Hebrew characters
  const rtlChars = (text.match(/[\u0600-\u06FF\u0590-\u05FF]/g) ?? []).length;
  const total = text.replace(/\s/g, "").length;
  return total > 0 && rtlChars / total > 0.3 ? "rtl" : "ltr";
}

// ─── Date group helper ──────────────────────────────────────────────────
function getDateGroup(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;
  if (ts >= todayStart) return "Today";
  if (ts >= yesterdayStart) return "Yesterday";
  if (ts >= weekStart) return "This Week";
  return "Older";
}

type GroupedSessions = { label: string; sessions: ChatSession[] }[];
function groupSessions(sessions: ChatSession[]): GroupedSessions {
  const order = ["Today", "Yesterday", "This Week", "Older"];
  const map: Record<string, ChatSession[]> = {};
  for (const s of sessions) {
    const g = getDateGroup(s.timestamp);
    if (!map[g]) map[g] = [];
    map[g].push(s);
  }
  return order.filter((g) => map[g]?.length).map((label) => ({ label, sessions: map[label] }));
}

// ─── Relative time helper ──────────────────────────────────────────────────
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
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
  const [toolStatus, setToolStatus]           = useState<ToolStatus | null>(null);
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [lastLang, setLastLang]               = useState<"ar" | "en">("en");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  // Track last language used in conversation
  useEffect(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setLastLang(detectDir(lastUserMsg.content) === "rtl" ? "ar" : "en");
    }
  }, [messages]);

  // Clear all sessions
  const handleClearAll = useCallback(() => {
    setSessions([]);
    saveLocal([]);
    broadcastSessions([], null);
    handleNewChat();
    setShowClearConfirm(false);
    toast.success("All conversations cleared");
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        sseBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw) as { content?: string; text?: string; status?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.status) {
              if (parsed.status === "thinking") {
                setToolStatus({ type: "thinking" });
              } else if (parsed.status.startsWith("tool:")) {
                const toolName = parsed.status.slice(5);
                setToolStatus({ type: "tool", toolName });
              }
              continue;
            }
            const chunk = parsed.content ?? parsed.text;
            if (chunk) {
              setToolStatus(null);
              accumulated += chunk;
              const finalAcc = accumulated;
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: finalAcc } : m));
            }
          } catch { /* partial JSON */ }
        }
      }
      setToolStatus(null);

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

        if (
          prevMessages.length === 0 &&
          accumulated.length > 20
        ) {
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

  // ── Block Update Handler ───────────────────────────────────────────────────
  const handleBlockUpdate = useCallback((messageId: string, blockIndex: number, updatedBlock: UIBlock) => {
    const patchContent = (content: string): string => {
      if (updatedBlock.type !== "campaign_preview" || !updatedBlock.generated_image_url) return content;
      let cpIdx = 0;
      return content.replace(/```ui-block\s*\n([\s\S]*?)```/g, (match, json: string) => {
        try {
          const parsed = JSON.parse(json.trim());
          if (parsed.type === "campaign_preview") {
            if (cpIdx === blockIndex) {
              parsed.generated_image_url = updatedBlock.generated_image_url;
              cpIdx++;
              return "```ui-block\n" + JSON.stringify(parsed) + "\n```";
            }
            cpIdx++;
          }
        } catch { /* skip */ }
        return match;
      });
    };

    const patchMessage = (m: ChatMessage): ChatMessage => {
      if (m.id !== messageId) return m;
      const blocks = [...(m.uiBlocks ?? [])];
      blocks[blockIndex] = updatedBlock;
      return { ...m, uiBlocks: blocks, content: patchContent(m.content) };
    };

    setMessages((prev) => prev.map(patchMessage));

    setSessions((prev) => {
      if (!activeSessionId) return prev;
      const updatedSessions = prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const updatedMessages = s.messages.map(patchMessage);
        const updatedSession = { ...s, messages: updatedMessages };
        if (user) {
          const dbMessages = updatedMessages.map(({ uiBlocks: _ub, isStreaming: _is, ...rest }) => rest);
          saveConversation.mutate({ ...updatedSession, messages: dbMessages });
        }
        return updatedSession;
      });
      saveLocal(updatedSessions);
      return updatedSessions;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, user]);

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

  const suggestions = [
    t("aiAgent.suggestion1", "Create a new campaign"),
    t("aiAgent.suggestion2", "Analyze my ad performance"),
    t("aiAgent.suggestion3", "Suggest content ideas"),
    t("aiAgent.suggestion4", "Optimize my budget"),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-neutral-950 overflow-hidden relative">

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "flex flex-col shrink-0 border-r border-neutral-800 bg-neutral-950 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-64" : "w-0",
        )}
      >
        {/* New Chat button — prominent, top of sidebar */}
        <div className="px-3 pt-4 pb-3 shrink-0">
          <button
            onClick={handleNewChat}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              "bg-brand-red text-white shadow-md shadow-brand-red/20",
              "hover:bg-brand-red/90 active:scale-[0.98]",
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">New Chat</span>
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <MessageSquare className="w-8 h-8 text-neutral-700 mb-2" />
              <p className="text-xs text-neutral-600">No conversations yet</p>
            </div>
          ) : (
            <div className="mt-1">
              {groupSessions(sessions).map(({ label, sessions: group }) => (
                <div key={label} className="mb-3">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                    {label}
                  </p>
                  <div className="space-y-0.5">
                    {group.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        onLoad={handleLoadSession}
                        onDelete={handleDeleteSession}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear all button */}
        {sessions.length > 0 && (
          <div className="px-3 pb-4 pt-1 shrink-0 border-t border-neutral-800">
            {showClearConfirm ? (
              <div className="flex items-center gap-2 pt-3">
                <span className="text-[11px] text-neutral-500 flex-1">Clear all?</span>
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 mt-3 px-3 py-2 rounded-xl text-[11px] text-neutral-500 hover:text-brand-red hover:bg-neutral-900 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Clear all conversations
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ── Sidebar toggle button ── */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className={cn(
          "absolute z-20 top-1/2 -translate-y-1/2 transition-all duration-300",
          "w-5 h-10 flex items-center justify-center",
          "bg-neutral-900 border border-neutral-800 rounded-r-lg",
          "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800",
          sidebarOpen ? "left-64" : "left-0",
        )}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* ── Empty State ── */}
        {!isInChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
            <div className="w-full max-w-2xl flex flex-col items-center">
              {/* Greeting */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-red/10 mb-5 border border-brand-red/20">
                  <Sparkles className="w-6 h-6 text-brand-red" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                  {t("aiAgent.greeting", { name: firstName })}
                </h1>
                <p className="text-neutral-400 text-[15px] max-w-md mx-auto leading-relaxed">
                  {t("aiAgent.subtitle")}
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2.5 mb-8 w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => void sendMessage(s)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      "border border-neutral-800 bg-neutral-900 text-neutral-300",
                      "hover:border-neutral-700 hover:bg-neutral-800 hover:text-white",
                      "active:scale-[0.97]",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="w-full">
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
                  lastLang={lastLang}
                />
                <p className="text-center text-[11px] text-neutral-600 mt-2">
                  {t("aiAgent.hint", "Enter to send • Shift+Enter for new line")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Chat State ── */}
        {isInChat && (
          <>
            {/* Messages area — scrollable */}
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
                    onBlockUpdate={(blockIndex, updatedBlock) => handleBlockUpdate(msg.id, blockIndex, updatedBlock)}
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
                    "sticky bottom-6 left-1/2 -translate-x-1/2 z-20 block mx-auto",
                    "w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 shadow-lg",
                    "flex items-center justify-center",
                    "hover:bg-neutral-800 transition-all",
                  )}
                >
                  <ArrowDown className="w-4 h-4 text-neutral-400" />
                </button>
              )}
            </div>

            {/* Input area — pinned to bottom */}
            <div className="shrink-0 px-4 pb-4 pt-2 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent">
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
                  lastLang={lastLang}
                />
                <p className="text-center text-[11px] text-neutral-600 mt-2">
                  {t("aiAgent.hint", "Enter to send • Shift+Enter for new line")}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Session Item ──────────────────────────────────────────────────────────
function SessionItem({
  session, isActive, onLoad, onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onLoad: (s: ChatSession) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
        isActive
          ? "bg-neutral-800 text-white"
          : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200",
      )}
      onClick={() => onLoad(session)}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{session.title}</p>
        <p className="text-[10px] text-neutral-600 mt-0.5">{relativeTime(session.timestamp)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-neutral-700 hover:text-brand-red transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Chat Input ────────────────────────────────────────────────────────────
function ChatInput({ input, setInput, isLoading, onSend, onKeyDown, onStop, textareaRef, isRtl, t, lastLang }: {
  input: string; setInput: (v: string) => void; isLoading: boolean;
  onSend: () => void; onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onStop: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>; isRtl: boolean; t: (k: string) => string;
  lastLang?: "ar" | "en";
}) {
  const hasText = input.trim().length > 0;
  // Smart placeholder: detect from current input first, then fall back to lastLang
  const inputDir = input.trim() ? detectDir(input) : (lastLang === "ar" ? "rtl" : "ltr");
  const effectiveRtl = inputDir === "rtl";
  const placeholder = effectiveRtl
    ? "اسألني عن حملاتك، إعلاناتك، أو استراتيجيتك التسويقية..."
    : (t("aiAgent.placeholder") || "Ask me about your campaigns, ads, or marketing strategy...");
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl transition-all duration-200",
        "border border-neutral-800 bg-neutral-900",
        "hover:border-neutral-700",
        "focus-within:border-neutral-600 focus-within:shadow-[0_0_0_3px_rgba(230,32,32,0.08)]",
      )}
    >
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        dir={effectiveRtl ? "rtl" : "ltr"}
        className={cn(
          "resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] text-white",
          "placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0",
          "min-h-[28px] max-h-[200px] leading-relaxed",
          effectiveRtl ? "text-right" : "text-left",
        )}
        style={{ boxShadow: "none" }}
      />

      {/* Bottom bar */}
      <div className={cn("flex items-center justify-between px-3 pb-3 pt-1", effectiveRtl ? "flex-row-reverse" : "")}>
        {/* Left icons */}
        <div className={cn("flex items-center gap-0.5", isRtl ? "flex-row-reverse" : "")}>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
            title="Attach file"
            onClick={() => toast.info("Feature coming soon")}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
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
              "bg-neutral-800 text-white hover:bg-neutral-700 active:scale-95",
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
                ? "bg-brand-red text-white hover:bg-brand-red/90 active:scale-95 shadow-sm shadow-brand-red/20"
                : "bg-neutral-800 text-neutral-600 cursor-not-allowed",
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
function MessageBubble({ msg, t, isRtl, onChipClick, onAction, onBlockUpdate }: {
  msg: ChatMessage; t: (k: string) => string; isRtl: boolean;
  onChipClick?: (c: string) => void; onAction?: (a: string) => void;
  onBlockUpdate?: (blockIndex: number, updatedBlock: UIBlock) => void;
}) {
  const isUser = msg.role === "user";
  const handleCopy = () => { void navigator.clipboard.writeText(msg.content); toast.success(t("aiAgent.copied")); };

  const { text: cleanText, blocks: parsedBlocks } = parseUIBlocks(msg.content);
  const uiBlocks: UIBlock[] = msg.uiBlocks ?? parsedBlocks;
  const displayText = uiBlocks.length > 0 ? cleanText : msg.content;

  const msgDir = detectDir(msg.content);
  const msgIsRtl = msgDir === "rtl";

  if (isUser) {
    return (
      <div className={cn("flex", msgIsRtl ? "justify-start" : "justify-end")}>
        <div
          className={cn(
            "max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
            "bg-brand-red/10 border border-brand-red/20 text-white",
            msgIsRtl ? "rounded-bl-md" : "rounded-br-md",
          )}
          dir={msgDir}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 group", msgIsRtl ? "flex-row-reverse" : "")}>
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-brand-red" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div
          className={cn(
            "rounded-2xl text-sm text-white",
            msgIsRtl ? "rounded-tr-md" : "rounded-tl-md",
          )}
          dir={msgDir}
        >
          {displayText ? (
            <div className="prose prose-sm max-w-none prose-headings:text-white prose-p:text-neutral-300 prose-p:leading-relaxed prose-strong:text-white prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:text-neutral-300 prose-blockquote:border-l-brand-red prose-blockquote:text-neutral-400 prose-a:text-brand-red prose-a:no-underline hover:prose-a:underline">
              <Streamdown>{displayText}</Streamdown>
            </div>
          ) : (
            <ThinkingDots />
          )}
        </div>

        {uiBlocks.length > 0 && !msg.isStreaming && (
          <GenerativeUIRenderer
            blocks={uiBlocks}
            onChipClick={onChipClick}
            onAction={onAction}
            onBlockUpdate={onBlockUpdate}
          />
        )}

        {displayText && !msg.isStreaming && (
          <div className={cn(
            "flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            msgIsRtl ? "flex-row-reverse" : "",
          )}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
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
          className="w-2 h-2 rounded-full bg-brand-red/60"
          style={{ animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-brand-red" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-neutral-900 border border-neutral-800">
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
      <div className="shrink-0 w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-brand-red" />
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-md bg-neutral-900 border border-neutral-800">
        <Loader2 className="w-3.5 h-3.5 text-brand-red animate-spin" />
        <span className="text-xs text-neutral-400 font-medium">{label}</span>
      </div>
    </div>
  );
}
