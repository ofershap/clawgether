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

  if (!room) {
    const isAutoJoining = mounted && roomId && userName.trim() && apiKey.trim() && !autoJoinFailed;
    const showLoader = isAutoJoining || (!mounted && roomId);

    if (showLoader) {
      return (
        <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-6 w-6 animate-spin rounded-full"
              style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--accent)" }}
            />
            <p className="text-[13px] animate-pulse" style={{ color: "var(--text-secondary)" }}>
              Reconnecting...
            </p>
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
        <RoomHeader />
        <ChatPanel />
      </div>
    </div>
  );
}
