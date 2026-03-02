"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

export function RoomHeader() {
  const room = useStore((s) => s.room);
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const roomUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${room.id}` : "";
  const onlineCount = room.participants.filter((p) => p.online).length;

  const copyLink = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 px-6 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <span className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>{room.name}</span>

      <span className="rounded px-2 py-0.5 font-mono text-[10px] font-medium" style={{ background: "var(--surface-elevated)", color: "var(--text-tertiary)" }}>
        {onlineCount} dev{onlineCount !== 1 ? "s" : ""} online
      </span>

      <div className="flex-1" />

      <span className="rounded px-2 py-0.5 font-mono text-[10px]" style={{ background: "rgba(52,211,153,0.08)", color: "var(--green)" }}>
        agent connected
      </span>

      <button onClick={copyLink}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
        {copied ? (<><Check className="h-3.5 w-3.5" style={{ color: "var(--green)" }} /> Copied</>) : (<><Copy className="h-3.5 w-3.5" /> Invite</>)}
      </button>
    </div>
  );
}
