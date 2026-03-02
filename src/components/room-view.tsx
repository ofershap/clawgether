"use client";

import { useEffect, useRef, useState } from "react";
import { useSocketEvents } from "@/hooks/use-socket-events";
import { useStore } from "@/lib/store";
import { connectSocket } from "@/lib/socket";
import { Lobby } from "./lobby";
import { RoomHeader } from "./room-header";
import { ChatPanel } from "./chat-panel";
import { Sidebar } from "./sidebar";

export function RoomView({ roomId }: { roomId?: string }) {
  useSocketEvents();
  const room = useStore((s) => s.room);
  const { userName, apiKey, setRoom, setParticipantId } = useStore();
  const [autoJoinFailed, setAutoJoinFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const attemptedRef = useRef(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !roomId || room || autoJoinFailed || attemptedRef.current) return;
    if (!userName.trim() || !apiKey.trim()) return;

    attemptedRef.current = true;

    const timeout = setTimeout(() => setAutoJoinFailed(true), 5000);

    const socket = connectSocket();

    const doJoin = () => {
      socket.emit(
        "room:join",
        { roomId, userName: userName.trim(), apiKey: apiKey.trim() },
        (joinedRoom, participantId, err) => {
          clearTimeout(timeout);
          if (err || !joinedRoom || !participantId) {
            setAutoJoinFailed(true);
            return;
          }
          setRoom(joinedRoom);
          setParticipantId(participantId);
        }
      );
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.once("connect", doJoin);
      socket.once("connect_error", () => { clearTimeout(timeout); setAutoJoinFailed(true); });
    }

    return () => clearTimeout(timeout);
  }, [mounted, roomId, room, userName, apiKey, autoJoinFailed, setRoom, setParticipantId]);

  const connected = useStore((s) => s.connected);
  const [showDisconnected, setShowDisconnected] = useState(false);

  useEffect(() => {
    if (connected) {
      setShowDisconnected(false);
      return;
    }
    const timer = setTimeout(() => setShowDisconnected(true), 15000);
    return () => clearTimeout(timer);
  }, [connected]);

  if (!room) {
    if (!mounted) return null;
    const isAutoJoining = roomId && userName.trim() && apiKey.trim() && !autoJoinFailed;

    if (isAutoJoining) {
      return (
        <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
          <div className="flex items-center gap-3 px-6 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="h-4 w-24 animate-pulse rounded" style={{ background: "var(--surface)" }} />
            <div className="flex-1" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-5 w-5 animate-spin rounded-full"
                style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--accent)" }}
              />
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Reconnecting to room...
              </p>
            </div>
          </div>
          <div className="px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="h-[42px] rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.5 }} />
          </div>
        </div>
      );
    }
    return <Lobby initialRoomId={roomId} />;
  }

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
      <div className="hidden w-[220px] shrink-0 lg:block" style={{ borderRight: "1px solid var(--border-subtle)" }}>
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <RoomHeader disconnected={showDisconnected} />
        <ChatPanel />
      </div>
    </div>
  );
}
