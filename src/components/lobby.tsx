"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { connectSocket } from "@/lib/socket";
import { ArrowRight, Plus, Eye, EyeOff, FolderOpen, Users, ExternalLink, KeyRound, LogIn, MessageSquare } from "lucide-react";
import { FolderBrowser } from "./folder-browser";

type AuthMode = "openrouter" | "apikey";

interface RoomListItem {
  id: string;
  name: string;
  participantCount: number;
  messageCount: number;
  createdAt: number;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function RoomList({ onJoin }: { onJoin: (roomId: string) => void }) {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    const fetch = () => { socket.emit("rooms:list", (r) => { setRooms(r); setLoaded(true); }); };
    if (socket.connected) fetch(); else socket.once("connect", fetch);
  }, []);

  if (!loaded || rooms.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
        Active rooms
      </p>
      <div className="space-y-1">
        {rooms.map((room) => (
          <button key={room.id} onClick={() => onJoin(room.id)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
            style={{ background: "var(--surface)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; }}>
            <MessageSquare className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{room.name}</p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {room.participantCount} online · {room.messageCount} msgs
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Lobby({ initialRoomId }: { initialRoomId?: string }) {
  const { apiKey, userName, setApiKey, setUserName, setRoom, setParticipantId, setJoining, joining } = useStore();

  const [mode, setMode] = useState<"create" | "join">(initialRoomId ? "join" : "create");
  const [authMode, setAuthMode] = useState<AuthMode>("openrouter");
  const [roomName, setRoomName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [joinRoomId, setJoinRoomId] = useState(initialRoomId || "");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [showBrowser, setShowBrowser] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthDone, setOauthDone] = useState(false);

  const hasKey = !!(apiKey && apiKey.trim());
  useEffect(() => { if (hasKey) setAuthMode("apikey"); }, [hasKey]);

  const canSubmit = userName.trim() && hasKey && (mode === "create" ? roomName.trim() : joinRoomId.trim());

  const handleOpenRouterLogin = useCallback(async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("or_code_verifier", verifier);
    setOauthLoading(true);
    const callbackUrl = window.location.origin + "/api/openrouter-callback";
    const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${challenge}&code_challenge_method=S256`;
    const popup = window.open(authUrl, "openrouter_auth", "width=600,height=700,popup=yes");
    const onMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "openrouter_code") return;
      window.removeEventListener("message", onMessage);
      const code = event.data.code as string;
      const storedVerifier = sessionStorage.getItem("or_code_verifier");
      if (!storedVerifier) { setError("OAuth session lost."); setOauthLoading(false); return; }
      try {
        const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: storedVerifier, code_challenge_method: "S256" }),
        });
        if (!res.ok) throw new Error("Key exchange failed");
        const data = await res.json();
        setApiKey(data.key); setOauthDone(true); setError("");
      } catch { setError("Failed to get API key from OpenRouter."); }
      finally { setOauthLoading(false); sessionStorage.removeItem("or_code_verifier"); }
    };
    window.addEventListener("message", onMessage);
    const pollTimer = setInterval(() => { if (popup?.closed) { clearInterval(pollTimer); setOauthLoading(false); } }, 500);
  }, [setApiKey]);

  useEffect(() => { if (apiKey?.startsWith("sk-or-")) setOauthDone(true); }, [apiKey]);

  const handleJoinFromList = (roomId: string) => {
    setJoinRoomId(roomId); setMode("join");
    if (userName.trim() && hasKey) performJoin(roomId);
  };

  const performJoin = (overrideRoomId?: string) => {
    const rid = overrideRoomId || joinRoomId.trim();
    if (!rid || !userName.trim() || !hasKey) return;
    setJoining(true); setError("");
    const socket = connectSocket();
    const doJoin = () => {
      socket.emit("room:join", { roomId: rid, userName: userName.trim(), apiKey: apiKey.trim() },
        (room, pid, err) => {
          if (err || !room || !pid) { setError(err || "Failed to join"); setJoining(false); return; }
          setRoom(room); setParticipantId(pid); setJoining(false);
        });
    };
    if (socket.connected) doJoin();
    else { socket.once("connect", doJoin); socket.once("connect_error", () => { setError("Failed to connect"); setJoining(false); }); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || joining) return;
    if (mode === "join") { performJoin(); return; }
    setJoining(true); setError("");
    const socket = connectSocket();
    const doCreate = () => {
      socket.emit("room:create",
        { name: roomName.trim(), projectPath: projectPath.trim() || undefined, userName: userName.trim(), apiKey: apiKey.trim() },
        (room, pid) => { setRoom(room); setParticipantId(pid); setJoining(false); window.history.pushState({}, "", `/room/${room.id}`); });
    };
    if (socket.connected) doCreate();
    else { socket.once("connect", doCreate); socket.once("connect_error", () => { setError("Failed to connect"); setJoining(false); }); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            clawgether
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Multiplayer coding with Claude
          </p>
        </div>

        <RoomList onJoin={handleJoinFromList} />

        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
          <div className="mb-5 flex rounded-lg p-0.5" style={{ background: "var(--bg)" }}>
            {(["create", "join"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium transition-all"
                style={{
                  background: mode === m ? "var(--surface-elevated)" : "transparent",
                  color: mode === m ? "var(--text)" : "var(--text-tertiary)",
                }}>
                {m === "create" ? <Plus className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                {m === "create" ? "Create" : "Join"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Your Name">
              <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Ofer" />
            </Field>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Authentication</label>
              <div className="mb-2.5 flex rounded-lg p-0.5" style={{ background: "var(--bg)" }}>
                {(["openrouter", "apikey"] as const).map((am) => (
                  <button key={am} type="button" onClick={() => setAuthMode(am)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[12px] font-medium transition-all"
                    style={{
                      background: authMode === am ? "var(--surface-elevated)" : "transparent",
                      color: authMode === am ? "var(--text)" : "var(--text-tertiary)",
                    }}>
                    {am === "openrouter" ? <><LogIn className="h-3 w-3" /> Login</> : <><KeyRound className="h-3 w-3" /> API Key</>}
                  </button>
                ))}
              </div>

              {authMode === "openrouter" ? (
                <div>
                  {oauthDone && hasKey ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.15)" }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--green)" }} />
                      <p className="flex-1 text-[12px]" style={{ color: "var(--green)" }}>Connected via OpenRouter</p>
                      <button type="button" onClick={() => { setApiKey(""); setOauthDone(false); }}
                        className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Disconnect</button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleOpenRouterLogin} disabled={oauthLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-all disabled:opacity-50"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "var(--text)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                      {oauthLoading ? "Waiting..." : <><LogIn className="h-4 w-4" /> Sign in with OpenRouter</>}
                    </button>
                  )}
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    Free. Access Claude via <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>OpenRouter</a>
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-ant-api03-... or sk-or-..." className="pr-10" />
                    <button type="button" onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Stored in browser only</p>
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-[11px] underline" style={{ color: "var(--text-tertiary)" }}>
                      Get key <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </>
              )}
            </div>

            {mode === "create" ? (
              <>
                <Field label="Room Name">
                  <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Auth Refactor Sprint" />
                </Field>
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    <FolderOpen className="h-3 w-3" /> Project Folder
                    <span className="font-normal normal-case tracking-normal" style={{ color: "var(--text-tertiary)" }}>(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <Input value={projectPath} onChange={(e) => setProjectPath(e.target.value)}
                      placeholder="/path/to/project" className="flex-1 font-mono text-[12px]" />
                    <button type="button" onClick={() => {
                      const sock = connectSocket();
                      if (sock.connected) setShowBrowser(true);
                      else sock.once("connect", () => setShowBrowser(true));
                    }} className="rounded-lg px-3 text-[12px] font-medium transition-all"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                      Browse
                    </button>
                  </div>
                  <FolderBrowser open={showBrowser} onClose={() => setShowBrowser(false)}
                    onSelect={(path) => setProjectPath(path)} initialPath={projectPath || undefined} />
                </div>
              </>
            ) : (
              <Field label="Room ID">
                <Input value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} placeholder="Paste room ID" />
              </Field>
            )}

            {error && <p className="text-[12px]" style={{ color: "var(--red)" }}>{error}</p>}

            <button type="submit" disabled={!canSubmit || joining}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all disabled:opacity-20"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}>
              {joining ? "Connecting..." : mode === "create" ? <>Create Room <ArrowRight className="h-4 w-4" /></> : <>Join Room <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Key sent to server for AI calls only. Never stored on disk.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg px-3 py-2.5 text-[13px] transition-all focus:outline-none ${className}`}
      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
      onFocus={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
    />
  );
}
