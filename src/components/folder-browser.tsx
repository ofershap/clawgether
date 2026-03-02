"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSocket } from "@/lib/socket";
import { ChevronUp, Folder, X, Check, Search } from "lucide-react";
import type { DirEntry } from "@/lib/types";

interface FolderBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function FolderBrowser({ open, onClose, onSelect, initialPath }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || "~");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const browse = useCallback((path: string) => {
    const socket = getSocket();
    if (!socket?.connected) return;
    setLoading(true);
    setFilter("");
    socket.emit("fs:browse", { path }, (dirs, parent) => {
      setEntries(dirs);
      setParentPath(parent);
      setCurrentPath(path === "~" ? dirs[0]?.path.split("/").slice(0, -1).join("/") || path : path);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.toLowerCase();
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, filter]);

  useEffect(() => {
    if (open) browse(initialPath || "~");
  }, [open, initialPath, browse]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[480px] w-full max-w-lg flex-col rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h3 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Select Project Folder</h3>
          <button onClick={onClose} className="rounded-md p-1 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <button onClick={() => parentPath && browse(parentPath)} disabled={!parentPath}
            className="rounded p-1 disabled:opacity-20" style={{ color: "var(--text-secondary)" }}>
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="flex-1 truncate font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>{currentPath}</span>
          <button onClick={() => { onSelect(currentPath); onClose(); }}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-[12px] font-medium text-white transition-all"
            style={{ background: "var(--accent)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}>
            <Check className="h-3 w-3" /> Select
          </button>
        </div>

        {entries.length > 8 && (
          <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
              <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." autoFocus
                className="w-full rounded-lg py-1.5 pl-8 pr-3 text-[12px] focus:outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>{filter ? "No matches" : "No subdirectories"}</div>
          ) : (
            <div>
              {filtered.map((entry) => (
                <button key={entry.path} onClick={() => browse(entry.path)}
                  onDoubleClick={() => { onSelect(entry.path); onClose(); }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <Folder className="h-4 w-4 shrink-0" style={{ color: "var(--text-secondary)" }} />
                  <span className="flex-1 truncate text-[13px]" style={{ color: "var(--text)" }}>{entry.name}</span>
                  {entry.isGitRepo && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "rgba(52,211,153,0.1)", color: "var(--green)" }}>git</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
