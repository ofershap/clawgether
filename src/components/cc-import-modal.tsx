"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Clock, FileText, Download, Loader2 } from "lucide-react";
import { getSocket } from "@/lib/socket";
import type { CCSession } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectPath: string;
}

export function CCImportModal({ open, onClose, projectPath }: Props) {
  const [sessions, setSessions] = useState<CCSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !projectPath) return;
    setLoading(true);
    setError("");
    setSuccess("");
    const socket = getSocket();
    socket.emit("cc:list", { projectPath }, (result) => { setSessions(result); setLoading(false); });
  }, [open, projectPath]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleImport = (sessionId: string) => {
    setImporting(sessionId);
    setError("");
    const socket = getSocket();
    socket.emit("cc:import", { sessionId, projectPath }, (ok, err) => {
      setImporting(null);
      if (ok) {
        setSuccess("Session imported");
        setTimeout(() => { onClose(); setSuccess(""); }, 1500);
      } else {
        setError(err || "Import failed");
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <h2 className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Import Claude Code Session</h2>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Load a past conversation into this room</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1" style={{ color: "var(--text-tertiary)" }}><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-tertiary)" }} />
              <span className="ml-2 text-[13px]" style={{ color: "var(--text-tertiary)" }}>Scanning...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>No sessions found</p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>Sessions live in ~/.claude/projects/</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-start gap-3 rounded-xl p-3 transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--accent-muted)" }}>
                    <MessageSquare className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{session.slug}</span>
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{session.sizeKb}KB</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px]" style={{ color: "var(--text-secondary)" }}>{session.firstMessage}</p>
                    <div className="mt-1 flex items-center gap-3 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> {session.messageCount}</span>
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {new Date(session.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleImport(session.id)} disabled={importing !== null}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all disabled:opacity-40"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                    {importing === session.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" /> Import</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {(error || success) && (
          <div className="px-5 py-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            {error && <p className="text-[12px]" style={{ color: "var(--red)" }}>{error}</p>}
            {success && <p className="text-[12px]" style={{ color: "var(--green)" }}>{success}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
