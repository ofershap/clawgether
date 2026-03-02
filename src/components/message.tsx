"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal, Bot, User, FileCode, SmilePlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ChatMessage, ToolCallInfo, FileDiff, Reaction } from "@/lib/types";
import { getSocket } from "@/lib/socket";
import { useStore } from "@/lib/store";

const QUICK_REACTIONS = ["👍", "👎", "🎉", "🤔", "❤️", "👀"];

function ToolCallBlock({ toolCall }: { toolCall: ToolCallInfo }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors rounded-lg"
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        {expanded ? <ChevronDown className="h-3 w-3" style={{ color: "var(--text-tertiary)" }} /> : <ChevronRight className="h-3 w-3" style={{ color: "var(--text-tertiary)" }} />}
        <Terminal className="h-3 w-3" style={{ color: "var(--text-secondary)" }} />
        <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{toolCall.name}</span>
        {toolCall.status === "running" && <span className="ml-auto animate-pulse text-[11px]" style={{ color: "var(--accent)" }}>running</span>}
        {toolCall.status === "done" && <span className="ml-auto text-[11px]" style={{ color: "var(--green)" }}>done</span>}
        {toolCall.status === "error" && <span className="ml-auto text-[11px]" style={{ color: "var(--red)" }}>error</span>}
      </button>
      {expanded && toolCall.output && (
        <div className="px-3 py-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            {toolCall.output.slice(0, 2000)}{toolCall.output.length > 2000 && "\n... (truncated)"}
          </pre>
        </div>
      )}
    </div>
  );
}

function DiffBlock({ diffs }: { diffs: FileDiff[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors rounded-lg"
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        {expanded ? <ChevronDown className="h-3 w-3" style={{ color: "var(--text-tertiary)" }} /> : <ChevronRight className="h-3 w-3" style={{ color: "var(--text-tertiary)" }} />}
        <FileCode className="h-3 w-3" style={{ color: "var(--text-secondary)" }} />
        <span style={{ color: "var(--text-secondary)" }}>{diffs.length} file{diffs.length !== 1 ? "s" : ""} changed</span>
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {diffs.map((d, i) => (
            <div key={i} style={{ borderBottom: i < diffs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
              <div className="px-3 py-1 font-mono text-[10px]" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>{d.path}</div>
              <pre className="max-h-40 overflow-auto px-3 py-1.5 text-[11px] leading-relaxed">
                {d.hunks.split("\n").map((line, j) => (
                  <span key={j} style={{ color: line.startsWith("+") ? "var(--green)" : line.startsWith("-") ? "var(--red)" : line.startsWith("@@") ? "var(--blue)" : "var(--text-tertiary)" }}>
                    {line}{"\n"}
                  </span>
                ))}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Reactions({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) {
  const [showPicker, setShowPicker] = useState(false);
  const participantId = useStore((s) => s.participantId);

  const toggleReaction = (emoji: string) => {
    getSocket().emit("reaction:toggle", { messageId, emoji });
    setShowPicker(false);
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {reactions.map((r) => {
        const isMine = participantId ? r.participantIds.includes(participantId) : false;
        return (
          <button key={r.emoji} onClick={() => toggleReaction(r.emoji)} title={r.participantNames.join(", ")}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-all"
            style={{
              background: isMine ? "var(--accent-muted)" : "var(--surface)",
              border: `1px solid ${isMine ? "rgba(255,107,61,0.3)" : "var(--border)"}`,
              color: isMine ? "var(--accent)" : "var(--text-secondary)",
            }}>
            <span>{r.emoji}</span>
            <span>{r.participantIds.length}</span>
          </button>
        );
      })}
      <div className="relative">
        <button onClick={() => setShowPicker(!showPicker)}
          className="flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100"
          style={{ color: "var(--text-tertiary)" }}>
          <SmilePlus className="h-3 w-3" />
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 z-40 mb-1 flex gap-0.5 rounded-lg p-1"
            style={{ background: "var(--surface-overlay)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => toggleReaction(emoji)}
                className="rounded p-1.5 text-sm transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-active)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeStr = String(children).replace(/\n$/, "");
            if (match) {
              return (
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div"
                  customStyle={{ margin: 0, borderRadius: "0.5rem", fontSize: "0.8rem", background: "#1a1a1c" }}>
                  {codeStr}
                </SyntaxHighlighter>
              );
            }
            return <code className="rounded px-1.5 py-0.5 text-[12px]" style={{ background: "var(--surface)", color: "var(--accent)" }} {...props}>{children}</code>;
          },
          p({ children }) { return <p className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>{children}</p>; },
          a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2" style={{ color: "var(--blue)" }}>{children}</a>;
          },
          strong({ children }) { return <strong style={{ color: "var(--text)" }}>{children}</strong>; },
          li({ children }) { return <li className="text-[13px]" style={{ color: "var(--text)" }}>{children}</li>; },
        }}>
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse" style={{ background: "var(--accent)" }} />}
    </div>
  );
}

interface MessageProps {
  message: ChatMessage;
  participantColor?: string;
}

export function Message({ message, participantColor }: MessageProps) {
  if (message.role === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full px-3 py-0.5 text-center text-[11px]" style={{ background: "var(--surface)", color: "var(--text-tertiary)" }}>
          {message.content}
        </span>
      </div>
    );
  }

  const isAssistant = message.role === "assistant";
  const reactions = message.reactions || [];

  return (
    <div className="group px-5 py-2.5 transition-colors"
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          {isAssistant ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "var(--accent)" }}>
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: participantColor || "#3b82f6" }}>
              {message.participantName?.[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              {message.participantName || "Unknown"}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isAssistant && message.costEstimate !== undefined && message.costEstimate > 0 && (
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>~${message.costEstimate.toFixed(3)}</span>
            )}
          </div>

          {isAssistant ? (
            <MarkdownContent content={message.content} isStreaming={message.isStreaming} />
          ) : (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>
              {highlightMentions(message.content)}
            </p>
          )}

          {message.toolCalls.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {message.toolCalls.map((tc) => <ToolCallBlock key={tc.id} toolCall={tc} />)}
            </div>
          )}
          {message.diff && message.diff.length > 0 && <DiffBlock diffs={message.diff} />}
          {reactions.length > 0 && <Reactions messageId={message.id} reactions={reactions} />}
        </div>
      </div>
    </div>
  );
}

function highlightMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="rounded px-0.5 font-medium" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>{part}</span>
    ) : part
  );
}
