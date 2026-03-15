/**
 * client/src/app/features/ai-agent/AIAgentPage.tsx
 * Dashfields Assist — Full-viewport AI chat interface.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  [Sidebar 260px]  │  [Chat Area — flex-1]            │
 *   │  - New Chat btn   │  - Empty state / Messages        │
 *   │  - Session list   │  - Pinned input bar at bottom    │
 *   └──────────────────────────────────────────────────────┘
 *
 * Design: System dark palette — bg #121212 / surface #1a1a1a / border #2a2a2a / brand #ef3735
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Plus, Loader2, Sparkles, Copy, Mic, Paperclip,
  ArrowDown, StopCircle, MessageSquare, Trash2, ChevronLeft, ChevronRight,
  X, FileText, Image as ImageIcon, Bot,
} from "lucide-react";
import { Textarea } from "@/core/components/ui/textarea";
import { useAuth } from "@/shared/hooks/useAuth";
import { supabase } from "@/core/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import { Streamdown } from "streamdown";
import { useTranslation } from "react-i18next";
import { trpc } from "@/core/lib/trpc";
import { GenerativeUIRenderer } from "./GenerativeUIRenderer";
import { parseUIBlocks } from "./types";
import type { ChatMessage, ChatSession, UIBlock, ToolStatus, ChatAttachment } from "./types";

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
function detectDir(text: string): "rtl" | "ltr" {
  if (!text) return "ltr";
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
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  useEffect(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setLastLang(detectDir(lastUserMsg.content) === "rtl" ? "ar" : "en");
    }
  }, [messages]);

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

  // ── File upload helpers ─────────────────────────────────────────────────────
  const ALLOWED_TYPES = [
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/pdf", "text/plain", "text/csv",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const uploadMutation = trpc.aiAgent.uploadChatAttachment.useMutation();

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large (max 10MB): ${file.name}`);
        continue;
      }
      const id = crypto.randomUUID();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const attachment: ChatAttachment = {
        id,
        fileName: file.name,
        url: "",
        mimeType: file.type,
        fileSize: file.size,
        previewUrl,
        status: "uploading",
      };
      setPendingAttachments((prev) => [...prev, attachment]);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const base64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          mimeType: file.type,
          fileData: base64,
          fileSize: file.size,
        });
        setPendingAttachments((prev) =>
          prev.map((a) => a.id === id ? { ...a, url: result.url ?? "", status: "done" } : a)
        );
      } catch {
        setPendingAttachments((prev) =>
          prev.map((a) => a.id === id ? { ...a, status: "error" } : a)
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // ── New chat ───────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setActiveSessionId(null);
    setPendingAttachments([]);
    abortRef.current?.abort();
    setIsLoading(false);
    setToolStatus(null);
  }, []);

  // ── Load session ───────────────────────────────────────────────────────────
  const handleLoadSession = useCallback((session: ChatSession) => {
    const msgs = session.messages.map((m) => ({
      ...m,
      uiBlocks: parseUIBlocks(m.content).blocks,
    }));
    setMessages(msgs);
    setActiveSessionId(session.id);
    setInput("");
    setPendingAttachments([]);
    abortRef.current?.abort();
    setIsLoading(false);
    setToolStatus(null);
  }, []);

  // ── Delete session ─────────────────────────────────────────────────────────
  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveLocal(updated);
      broadcastSessions(updated, activeSessionId);
      return updated;
    });
    if (activeSessionId === id) handleNewChat();
    if (user) deleteConversation.mutate({ id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, user]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    const readyAtts = pendingAttachments.filter((a) => a.status === "done");
    if (!trimmed && readyAtts.length === 0) return;
    if (isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
      attachments: readyAtts.length > 0 ? readyAtts : undefined,
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };

    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);
    setToolStatus(null);

    const token = await getToken();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const historyForApi = messages.map(({ role, content }) => ({ role, content }));
      const requestBody: Record<string, unknown> = {
        message: trimmed,
        history: historyForApi,
      };
      if (readyAtts.length > 0) {
        requestBody.attachments = readyAtts.map((a) => ({
          url: a.url,
          mimeType: a.mimeType,
          fileName: a.fileName,
        }));
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/ai-agent/stream", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "tool_start" || parsed.type === "thinking") {
              setToolStatus({ type: parsed.type, toolName: parsed.toolName });
            } else if (parsed.type === "tool_end") {
              setToolStatus(null);
            } else if (parsed.delta) {
              accumulated += parsed.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulated, isStreaming: true }
                    : m
                )
              );
            }
          } catch { /* skip malformed */ }
        }
      }

      const finalBlocks = parseUIBlocks(accumulated).blocks;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: accumulated, isStreaming: false, uiBlocks: finalBlocks }
            : m
        )
      );

      const finalMessages = newMessages.map((m) =>
        m.id === assistantMsgId
          ? { ...m, content: accumulated, isStreaming: false }
          : m
      );

      const sessionId = activeSessionId ?? crypto.randomUUID();
      const isNew = !activeSessionId;
      setActiveSessionId(sessionId);

      const sessionTitle = sessions.find((s) => s.id === sessionId)?.title
        ?? trimmed.slice(0, 50) + (trimmed.length > 50 ? "…" : "");

      const session: ChatSession = {
        id: sessionId,
        title: sessionTitle,
        preview: trimmed.slice(0, 80),
        messages: finalMessages.map(({ uiBlocks: _ub, isStreaming: _is, ...rest }) => rest),
        timestamp: Date.now(),
      };
      persistSession(session);

      if (isNew && user) {
        generateTitle.mutate(
          { userMessage: trimmed, assistantReply: accumulated.slice(0, 1000) },
          {
            onSuccess: (data) => {
              if (data?.title) {
                setSessions((prev) =>
                  prev.map((s) => s.id === sessionId ? { ...s, title: data.title } : s)
                );
              }
            },
          }
        );
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      toast.error("Failed to get response. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setIsLoading(false);
      setToolStatus(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading, pendingAttachments, activeSessionId, sessions, user, getToken, persistSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }, [input, sendMessage]);

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
    <div className="flex h-full overflow-hidden" style={{ background: "#0f0f0f" }}>

      {/* ══ Sidebar ══════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "flex flex-col shrink-0 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-64" : "w-0",
        )}
        style={{ background: "#121212", borderRight: "1px solid #222" }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,55,53,0.12)", border: "1px solid rgba(239,55,53,0.2)" }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: "#ef3735" }} />
            </div>
            <span className="text-sm font-semibold text-white">Assist</span>
          </div>

          {/* New Chat button */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              background: "#ef3735",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(239,55,53,0.25)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#d42e2c")}
            onMouseLeave={e => (e.currentTarget.style.background = "#ef3735")}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">New Chat</span>
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <MessageSquare className="w-7 h-7 mb-2" style={{ color: "#333" }} />
              <p className="text-xs" style={{ color: "#444" }}>No conversations yet</p>
            </div>
          ) : (
            <div className="mt-1">
              {groupSessions(sessions).map(({ label, sessions: group }) => (
                <div key={label} className="mb-3">
                  <p
                    className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "#444" }}
                  >
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

        {/* Clear all */}
        {sessions.length > 0 && (
          <div
            className="px-3 pb-4 pt-1 shrink-0"
            style={{ borderTop: "1px solid #1e1e1e" }}
          >
            {showClearConfirm ? (
              <div className="flex items-center gap-2 pt-3">
                <span className="text-[11px] flex-1" style={{ color: "#555" }}>Clear all?</span>
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                  style={{ background: "#ef3735", color: "#fff" }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                  style={{ background: "#1e1e1e", color: "#a1a1aa", border: "1px solid #2a2a2a" }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 mt-3 px-3 py-2 rounded-xl text-[11px] transition-all"
                style={{ color: "#555" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef3735"; e.currentTarget.style.background = "#1a1a1a"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "transparent"; }}
              >
                <Trash2 className="w-3 h-3" />
                Clear all conversations
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ══ Sidebar toggle ═══════════════════════════════════════════════════ */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className={cn(
          "absolute z-20 top-1/2 -translate-y-1/2 transition-all duration-300",
          "w-5 h-10 flex items-center justify-center",
          sidebarOpen ? "left-64" : "left-0",
        )}
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "0 6px 6px 0",
          color: "#555",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "#222"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "#1a1a1a"; }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ══ Main chat area ════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* ── Empty State ── */}
        {!isInChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
            <div className="w-full max-w-2xl flex flex-col items-center">

              {/* Hero icon */}
              <div className="mb-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(239,55,53,0.08)",
                    border: "1px solid rgba(239,55,53,0.15)",
                    boxShadow: "0 0 40px rgba(239,55,53,0.06)",
                  }}
                >
                  <Sparkles className="w-7 h-7" style={{ color: "#ef3735" }} />
                </div>
              </div>

              {/* Greeting */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                  {t("aiAgent.greeting", { name: firstName }) || `Hello${firstName ? `, ${firstName}` : ""}!`}
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-foreground)", maxWidth: 380, margin: "0 auto" }}>
                  {t("aiAgent.subtitle") || "Your AI marketing assistant. Ask me anything about your campaigns, analytics, or strategy."}
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-8 w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => void sendMessage(s)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
                    style={{
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      color: "var(--color-muted-foreground)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-muted-foreground)"; e.currentTarget.style.background = "var(--color-popover)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "var(--color-card)"; e.currentTarget.style.color = "var(--color-muted-foreground)"; }}
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
                  pendingAttachments={pendingAttachments}
                  onAddFiles={addFiles}
                  onRemoveAttachment={removeAttachment}
                />
                <p className="text-center text-[11px] mt-2" style={{ color: "#3a3a3a" }}>
                  {t("aiAgent.hint", "Enter to send · Shift+Enter for new line")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Chat State ── */}
        {isInChat && (
          <>
            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
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

              {showScrollBtn && (
                <button
                  onClick={scrollToBottom}
                  className="sticky bottom-6 left-1/2 -translate-x-1/2 z-20 block mx-auto w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    color: "#a1a1aa",
                  }}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Input pinned to bottom */}
            <div
              className="shrink-0 px-4 pb-4 pt-3"
              style={{ background: "linear-gradient(to top, #0f0f0f 70%, transparent)" }}
            >
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
                  pendingAttachments={pendingAttachments}
                  onAddFiles={addFiles}
                  onRemoveAttachment={removeAttachment}
                />
                <p className="text-center text-[11px] mt-2" style={{ color: "#3a3a3a" }}>
                  {t("aiAgent.hint", "Enter to send · Shift+Enter for new line")}
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
      className="group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
      style={{
        background: isActive ? "#1e1e1e" : "transparent",
        color: isActive ? "#fff" : "#666",
        border: isActive ? "1px solid #2a2a2a" : "1px solid transparent",
      }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "#181818"; e.currentTarget.style.color = "#ccc"; } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#666"; } }}
      onClick={() => onLoad(session)}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{session.title}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "#444" }}>{relativeTime(session.timestamp)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{ color: "#555" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#2a2a2a"; e.currentTarget.style.color = "#ef3735"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555"; }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Chat Input ────────────────────────────────────────────────────────────
function ChatInput({
  input, setInput, isLoading, onSend, onKeyDown, onStop, textareaRef, isRtl, t, lastLang,
  pendingAttachments, onAddFiles, onRemoveAttachment,
}: {
  input: string; setInput: (v: string) => void; isLoading: boolean;
  onSend: () => void; onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onStop: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>; isRtl: boolean; t: (k: string) => string;
  lastLang?: "ar" | "en";
  pendingAttachments: ChatAttachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasText = input.trim().length > 0;
  const hasAttachments = pendingAttachments.length > 0;
  const canSend = hasText || hasAttachments;
  const inputDir = input.trim() ? detectDir(input) : (lastLang === "ar" ? "rtl" : "ltr");
  const effectiveRtl = inputDir === "rtl";
  const placeholder = effectiveRtl
    ? "اسألني عن حملاتك، إعلاناتك، أو استراتيجيتك التسويقية..."
    : (t("aiAgent.placeholder") || "Ask me about your campaigns, ads, or marketing strategy...");

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) onAddFiles(e.dataTransfer.files);
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") { const f = items[i].getAsFile(); if (f) files.push(f); }
    }
    if (files.length > 0) { e.preventDefault(); onAddFiles(files); }
  };
  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col rounded-2xl transition-all duration-200"
      style={{
        background: "#171717",
        border: isDragOver
          ? "1px solid rgba(239,55,53,0.5)"
          : "1px solid #252525",
        boxShadow: isDragOver
          ? "0 0 0 3px rgba(239,55,53,0.1)"
          : "0 2px 12px rgba(0,0,0,0.3)",
      }}
      onFocus={() => {}}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(239,55,53,0.04)", border: "2px dashed rgba(239,55,53,0.3)" }}
        >
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#ef3735" }}>
            <Paperclip className="w-4 h-4" /> Drop files here
          </div>
        </div>
      )}

      {/* Attachment preview strip */}
      {hasAttachments && (
        <div className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto">
          {pendingAttachments.map((att) => (
            <div key={att.id} className="relative shrink-0 group/att">
              {att.mimeType.startsWith("image/") ? (
                <div
                  className="w-16 h-16 rounded-lg overflow-hidden"
                  style={{ border: "1px solid #2a2a2a", background: "#1e1e1e" }}
                >
                  <img src={att.previewUrl || att.url} alt={att.fileName} className={cn("w-full h-full object-cover", att.status === "uploading" && "opacity-50")} />
                  {att.status === "uploading" && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
                </div>
              ) : (
                <div
                  className={cn("w-36 h-16 rounded-lg flex items-center gap-2 px-2", att.status === "uploading" && "opacity-50")}
                  style={{ border: "1px solid #2a2a2a", background: "#1e1e1e" }}
                >
                  <FileText className="w-5 h-5 shrink-0" style={{ color: "#555" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] truncate" style={{ color: "#ccc" }}>{att.fileName}</p>
                    <p className="text-[10px]" style={{ color: "#555" }}>{fmtSize(att.fileSize)}</p>
                  </div>
                  {att.status === "uploading" && <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: "#555" }} />}
                </div>
              )}
              <button
                onClick={() => onRemoveAttachment(att.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-all"
                style={{ background: "#2a2a2a", border: "1px solid #333" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#ef3735"; e.currentTarget.style.borderColor = "#ef3735"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#2a2a2a"; e.currentTarget.style.borderColor = "#333"; }}
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {att.status === "error" && (
                <div
                  className="absolute inset-0 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(239,55,53,0.1)", border: "1px solid rgba(239,55,53,0.3)" }}
                >
                  <span className="text-[10px] font-medium" style={{ color: "#f87171" }}>Failed</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) { onAddFiles(e.target.files); e.target.value = ""; } }}
      />

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        dir={effectiveRtl ? "rtl" : "ltr"}
        className={cn(
          "resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] text-white",
          "placeholder:text-neutral-600 focus-visible:ring-0 focus-visible:ring-offset-0",
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
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#444" }}
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e1e"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.background = "transparent"; }}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#444" }}
            title="Voice input"
            onClick={() => toast.info("Feature coming soon")}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e1e"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.background = "transparent"; }}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Send / Stop */}
        {isLoading ? (
          <button
            onClick={onStop}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "#1e1e1e", color: "#a1a1aa", border: "1px solid #2a2a2a" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#252525"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#1e1e1e"; }}
          >
            <StopCircle className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!canSend}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
            style={canSend
              ? { background: "#ef3735", color: "#fff", boxShadow: "0 2px 8px rgba(239,55,53,0.3)" }
              : { background: "#1a1a1a", color: "#333", cursor: "not-allowed" }
            }
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

  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  if (isUser) {
    const atts = msg.attachments ?? [];
    const images = atts.filter((a) => a.mimeType.startsWith("image/"));
    const files = atts.filter((a) => !a.mimeType.startsWith("image/"));
    return (
      <div className={cn("flex", msgIsRtl ? "justify-start" : "justify-end")}>
        <div
          className={cn(
            "max-w-[75%] rounded-2xl text-sm leading-relaxed",
            msgIsRtl ? "rounded-bl-md" : "rounded-br-md",
            (images.length > 0 || files.length > 0) ? "overflow-hidden" : "",
          )}
          style={{
            background: "rgba(239,55,53,0.08)",
            border: "1px solid rgba(239,55,53,0.15)",
            color: "#fff",
          }}
          dir={msgDir}
        >
          {images.length > 0 && (
            <div className={cn("flex gap-1 p-2", images.length === 1 ? "" : "flex-wrap")}>
              {images.map((img) => (
                <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className={cn("block rounded-lg overflow-hidden", images.length === 1 ? "w-full" : "w-28 h-28")}>
                  <img src={img.url} alt={img.fileName} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </a>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="flex flex-col gap-1 px-3 pt-2 pb-1">
              {files.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <FileText className="w-4 h-4 shrink-0" style={{ color: "#666" }} />
                  <span className="text-xs truncate flex-1" style={{ color: "#ccc" }}>{f.fileName}</span>
                  <span className="text-[10px] shrink-0" style={{ color: "#555" }}>{fmtSize(f.fileSize)}</span>
                </a>
              ))}
            </div>
          )}
          {msg.content && (
            <div className="px-4 py-3">
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 group", msgIsRtl ? "flex-row-reverse" : "")}>
      {/* Avatar */}
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
        style={{
          background: "#1a1a1a",
          border: "1px solid #252525",
        }}
      >
        <Sparkles className="w-3.5 h-3.5" style={{ color: "#ef3735" }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div
          className={cn("rounded-2xl text-sm text-white", msgIsRtl ? "rounded-tr-md" : "rounded-tl-md")}
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
            dir={msgIsRtl ? "rtl" : "ltr"}
          />
        )}

        {displayText && !msg.isStreaming && (
          <div className={cn(
            "flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            msgIsRtl ? "flex-row-reverse" : "",
          )}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors"
              style={{ color: "#444" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e1e"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.background = "transparent"; }}
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

// ─── Thinking Dots ─────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: "rgba(239,55,53,0.5)",
            animation: "pulse 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Thinking Indicator ────────────────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
        style={{ background: "#1a1a1a", border: "1px solid #252525" }}
      >
        <Sparkles className="w-3.5 h-3.5" style={{ color: "#ef3735" }} />
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-md"
        style={{ background: "#171717", border: "1px solid #222" }}
      >
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
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
        style={{ background: "#1a1a1a", border: "1px solid #252525" }}
      >
        <Sparkles className="w-3.5 h-3.5" style={{ color: "#ef3735" }} />
      </div>
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl rounded-tl-md"
        style={{ background: "#171717", border: "1px solid #222" }}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#ef3735" }} />
        <span className="text-xs font-medium" style={{ color: "#666" }}>{label}</span>
      </div>
    </div>
  );
}
