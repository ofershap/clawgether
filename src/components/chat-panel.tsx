"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Square, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { getSocket } from "@/lib/socket";
import { Message } from "./message";

function TypingIndicator() {
  const typingUsers = useStore((s) => s.typingUsers);
  const participantId = useStore((s) => s.participantId);

  const others = typingUsers.filter((u) => u.participantId !== participantId);
  if (others.length === 0) return null;

  const names = others.map((u) => u.participantName);
  let text: string;
  if (names.length === 1) text = `${names[0]} is typing`;
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing`;
  else text = `${names.length} people are typing`;

  return (
    <div className="flex items-center gap-2 px-6 py-1.5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full" style={{ background: "var(--accent)", animationDelay: "0ms" }} />
        <span className="h-1 w-1 animate-bounce rounded-full" style={{ background: "var(--accent)", animationDelay: "150ms" }} />
        <span className="h-1 w-1 animate-bounce rounded-full" style={{ background: "var(--accent)", animationDelay: "300ms" }} />
      </span>
      {text}
    </div>
  );
}

function MentionDropdown({
  query, participants, onSelect, position,
}: {
  query: string;
  participants: Array<{ id: string; name: string; color: string }>;
  onSelect: (name: string) => void;
  position: { top: number; left: number };
}) {
  const filtered = participants.filter((p) => p.name.toLowerCase().startsWith(query.toLowerCase()));
  if (filtered.length === 0) return null;

  return (
    <div className="absolute z-50 rounded-xl py-1"
      style={{ bottom: position.top, left: position.left, minWidth: 160, background: "var(--surface-overlay)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      {filtered.map((p) => (
        <button key={p.id} onClick={() => onSelect(p.name)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors"
          style={{ color: "var(--text)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-active)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <div className="flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold"
            style={{ backgroundColor: p.color, color: "var(--bg)" }}>
            {p.name[0].toUpperCase()}
          </div>
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  );
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { messages, room, queue, participantId } = useStore();

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState({ top: 48, left: 12 });

  const isAgentBusy = messages.some((m) => m.isStreaming);
  const userQueueCount = queue.length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleNewMessage = (msg: { participantName: string | null; role: string; content: string }) => {
      if (document.hidden && msg.role !== "system") {
        document.title = `* ${msg.participantName || "Claude"} - clawgether`;
        if (Notification.permission === "granted") {
          new Notification(`${msg.participantName || "Claude"}`, { body: msg.content.slice(0, 100), icon: "/favicon.ico" });
        }
      }
    };
    const socket = getSocket();
    socket.on("message:new", handleNewMessage);
    const onFocus = () => { document.title = "clawgether"; };
    window.addEventListener("focus", onFocus);
    if (Notification.permission === "default") Notification.requestPermission();
    return () => { socket.off("message:new", handleNewMessage); window.removeEventListener("focus", onFocus); };
  }, []);

  const emitTyping = useCallback((isTyping: boolean) => {
    const socket = getSocket();
    socket.emit(isTyping ? "typing:start" : "typing:stop");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    emitTyping(true);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 3000);
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) { setMentionQuery(atMatch[1]); setMentionPos({ top: 48, left: 12 }); }
    else setMentionQuery(null);
  };

  const handleMentionSelect = (name: string) => {
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const replaced = textBefore.replace(/@\w*$/, `@${name} `);
    setInput(replaced + textAfter);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const socket = getSocket();
    socket.emit("message:send", { content: trimmed });
    setInput("");
    emitTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    inputRef.current?.focus();
  };

  const handleStop = () => { getSocket().emit("agent:stop"); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getParticipantColor = (pid: string | null) => {
    if (!pid || !room) return undefined;
    return room.participants.find((p) => p.id === pid)?.color;
  };

  const otherParticipants = room?.participants.filter((p) => p.id !== participantId) || [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2" style={{ color: "var(--text-tertiary)" }}>
            <p className="text-[13px]">Send a message to start. Everyone in the room sees it.</p>
          </div>
        ) : (
          <div className="py-1">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} participantColor={getParticipantColor(msg.participantId)} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <TypingIndicator />

      {userQueueCount > 0 && (
        <div className="px-6 py-1.5 text-center text-[12px]" style={{ color: "var(--accent)" }}>
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          {userQueueCount} message{userQueueCount > 1 ? "s" : ""} queued
        </div>
      )}

      <div className="relative px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        {mentionQuery !== null && otherParticipants.length > 0 && (
          <MentionDropdown query={mentionQuery} participants={otherParticipants} onSelect={handleMentionSelect} position={mentionPos} />
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message the room... (@ to mention)"
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-2.5 text-[13px] focus:outline-none transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              minHeight: "42px",
              maxHeight: "120px",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          {isAgentBusy ? (
            <button onClick={handleStop}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl transition-all"
              style={{ background: "var(--red)", color: "#fff" }} title="Stop">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-15"
              style={{ background: "var(--accent)", color: "#fff" }} title="Send">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
