"use client";

import { useState } from "react";
import {
  Users, Circle, FileText, GitBranch, Coins,
  ChevronDown, ChevronRight, Map, Undo2, Download,
  MessageSquare, Code2, Sparkles, Upload,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { getSocket } from "@/lib/socket";
import { CCImportModal } from "./cc-import-modal";
import type { RoomMode } from "@/lib/types";

function ModeToggle() {
  const room = useStore((s) => s.room);
  if (!room) return null;

  const handleToggle = (mode: RoomMode) => {
    getSocket().emit("room:setMode", { mode });
  };

  return (
    <div className="px-3 py-3">
      <div className="flex rounded-lg p-0.5" style={{ background: "var(--bg)" }}>
        <button onClick={() => handleToggle("code")}
          className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-all"
          style={{ background: room.mode === "code" ? "var(--accent)" : "transparent", color: room.mode === "code" ? "#fff" : "var(--text-tertiary)" }}>
          <Code2 className="h-3 w-3" /> Code
        </button>
        <button onClick={() => handleToggle("ask")}
          className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-all"
          style={{ background: room.mode === "ask" ? "var(--blue)" : "transparent", color: room.mode === "ask" ? "#fff" : "var(--text-tertiary)" }}>
          <MessageSquare className="h-3 w-3" /> Ask
        </button>
      </div>
      <p className="mt-1.5 text-[10px] leading-tight" style={{ color: "var(--text-tertiary)" }}>
        {room.mode === "code" ? "Claude reads and edits files" : "Discussion only, no file changes"}
      </p>
    </div>
  );
}

function SectionLabel({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count?: number }) {
  return (
    <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
      <Icon className="h-3 w-3" /> {label} {count !== undefined && <span className="ml-auto font-mono">{count}</span>}
    </h3>
  );
}

function ParticipantsSection() {
  const room = useStore((s) => s.room);
  if (!room) return null;
  const online = room.participants.filter((p) => p.online);
  const offline = room.participants.filter((p) => !p.online);

  return (
    <div className="px-3 py-2">
      <SectionLabel icon={Users} label="In Room" count={online.length} />
      <div className="space-y-1">
        {online.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold text-white" style={{ backgroundColor: p.color }}>
              {p.name[0].toUpperCase()}
            </div>
            <span className="flex-1 text-[12px]" style={{ color: "var(--text)" }}>{p.name}</span>
            <Circle className="h-1.5 w-1.5 fill-current" style={{ color: "var(--green)" }} />
          </div>
        ))}
        {offline.map((p) => (
          <div key={p.id} className="flex items-center gap-2 opacity-25">
            <div className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold text-white" style={{ backgroundColor: p.color }}>
              {p.name[0].toUpperCase()}
            </div>
            <span className="flex-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GitStatusSection() {
  const gitStatus = useStore((s) => s.gitStatus);
  if (!gitStatus) return null;

  return (
    <div className="px-3 py-2">
      <SectionLabel icon={GitBranch} label="Git" />
      <div className="space-y-0.5 text-[12px]">
        <div className="flex justify-between">
          <span style={{ color: "var(--text-tertiary)" }}>Branch</span>
          <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{gitStatus.branch}</span>
        </div>
        {gitStatus.uncommittedCount > 0 && (
          <div className="flex justify-between">
            <span style={{ color: "var(--text-tertiary)" }}>Uncommitted</span>
            <span style={{ color: "var(--yellow)" }}>{gitStatus.uncommittedCount}</span>
          </div>
        )}
        {gitStatus.aheadCount > 0 && (
          <div className="flex justify-between">
            <span style={{ color: "var(--text-tertiary)" }}>Ahead</span>
            <span style={{ color: "var(--green)" }}>{gitStatus.aheadCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FileContextSection() {
  const fileContext = useStore((s) => s.fileContext);
  const [expanded, setExpanded] = useState(false);
  if (fileContext.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)" }}>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <FileText className="h-3 w-3" /> Files ({fileContext.length})
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-0.5">
          {fileContext.slice(-15).reverse().map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span style={{ color: f.action === "edit" ? "var(--yellow)" : f.action === "create" ? "var(--green)" : f.action === "delete" ? "var(--red)" : "var(--blue)" }}>
                {f.action === "edit" ? "M" : f.action === "create" ? "A" : f.action === "delete" ? "D" : "R"}
              </span>
              <span className="flex-1 truncate font-mono" style={{ color: "var(--text-tertiary)" }}>{f.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenUsageSection() {
  const tokenUsage = useStore((s) => s.tokenUsage);
  if (tokenUsage.messageCount === 0) return null;

  return (
    <div className="px-3 py-2">
      <SectionLabel icon={Coins} label="Usage" />
      <div className="space-y-0.5 text-[12px]">
        <div className="flex justify-between">
          <span style={{ color: "var(--text-tertiary)" }}>Messages</span>
          <span style={{ color: "var(--text-secondary)" }}>{tokenUsage.messageCount}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--text-tertiary)" }}>Cost</span>
          <span className="font-mono" style={{ color: "var(--accent)" }}>${tokenUsage.totalCost.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

function RepoMapSection() {
  const repoMap = useStore((s) => s.repoMap);
  const [expanded, setExpanded] = useState(false);
  if (repoMap.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)" }}>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Map className="h-3 w-3" /> Repo Map ({repoMap.length})
      </button>
      {expanded && (
        <div className="mt-1.5 max-h-48 space-y-0.5 overflow-y-auto">
          {repoMap.slice(0, 100).map((e, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              {e.inContext && <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />}
              <span className="flex-1 truncate font-mono" style={{ color: "var(--text-tertiary)" }}>{e.path}</span>
              <span style={{ color: "var(--text-tertiary)" }}>{e.symbols.length}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionsSection() {
  const lastUndo = useStore((s) => s.lastUndo);
  const gitStatus = useStore((s) => s.gitStatus);
  const room = useStore((s) => s.room);
  const [showImport, setShowImport] = useState(false);

  const handleUndo = () => { getSocket().emit("agent:undo"); };
  const handleSummary = () => { getSocket().emit("summary:request"); };

  const handleExport = () => {
    getSocket().emit("session:export", (data) => {
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clawgether-${data.roomName.replace(/\s+/g, "-")}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="px-3 py-3">
      <div className="grid grid-cols-2 gap-1.5">
        {gitStatus && <ActionBtn onClick={handleUndo}><Undo2 className="h-3 w-3" /> Undo</ActionBtn>}
        <ActionBtn onClick={handleExport}><Download className="h-3 w-3" /> Export</ActionBtn>
        <ActionBtn onClick={handleSummary} accent><Sparkles className="h-3 w-3" /> Summary</ActionBtn>
        {room?.projectPath && <ActionBtn onClick={() => setShowImport(true)}><Upload className="h-3 w-3" /> Import</ActionBtn>}
      </div>
      {room?.projectPath && (
        <CCImportModal open={showImport} onClose={() => setShowImport(false)} projectPath={room.projectPath} />
      )}
      {lastUndo && (
        <div className="mt-2 rounded-lg px-2.5 py-1.5 text-[10px]"
          style={{ background: lastUndo.success ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", color: lastUndo.success ? "var(--green)" : "var(--red)" }}>
          {lastUndo.participantName}: {lastUndo.message}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, accent, children }: { onClick: () => void; accent?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-all"
      style={{
        background: accent ? "var(--accent-muted)" : "var(--surface)",
        border: `1px solid ${accent ? "rgba(255,107,61,0.2)" : "var(--border)"}`,
        color: accent ? "var(--accent)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = accent ? "rgba(255,107,61,0.2)" : "var(--surface-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = accent ? "var(--accent-muted)" : "var(--surface)"; }}>
      {children}
    </button>
  );
}

export function Sidebar() {
  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ background: "var(--surface)" }}>
      <ModeToggle />
      <div className="h-px mx-3" style={{ background: "var(--border)" }} />
      <ParticipantsSection />
      <div className="h-px mx-3" style={{ background: "var(--border-subtle)" }} />
      <GitStatusSection />
      <FileContextSection />
      <TokenUsageSection />
      <RepoMapSection />
      <div className="mt-auto">
        <div className="h-px mx-3" style={{ background: "var(--border-subtle)" }} />
        <ActionsSection />
      </div>
    </div>
  );
}
