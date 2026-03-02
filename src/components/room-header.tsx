"use client";

import { Copy, Check, FolderOpen, GitBranch } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

export function RoomHeader() {
  const room = useStore((s) => s.room);
  const gitStatus = useStore((s) => s.gitStatus);
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const roomUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${room.id}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-[14px] font-semibold truncate" style={{ color: "var(--text)" }}>{room.name}</h1>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{
          background: room.mode === "code" ? "var(--accent-muted)" : "rgba(96, 165, 250, 0.12)",
          color: room.mode === "code" ? "var(--accent)" : "var(--blue)",
        }}>
          {room.mode}
        </span>
        {room.projectPath && (
          <div className="hidden md:flex items-center gap-1 text-[12px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
            <FolderOpen className="h-3 w-3" />
            <span className="font-mono truncate max-w-[300px]">{room.projectPath}</span>
          </div>
        )}
        {gitStatus && (
          <div className="hidden md:flex items-center gap-1 text-[12px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
            <GitBranch className="h-3 w-3" />
            <span className="font-mono">{gitStatus.branch}</span>
            {gitStatus.uncommittedCount > 0 && (
              <span style={{ color: "var(--yellow)" }}>+{gitStatus.uncommittedCount}</span>
            )}
          </div>
        )}
      </div>
      <button onClick={copyLink}
        className="shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
        {copied ? (<><Check className="h-3.5 w-3.5" style={{ color: "var(--green)" }} /> Copied</>) : (<><Copy className="h-3.5 w-3.5" /> Invite</>)}
      </button>
    </div>
  );
}
