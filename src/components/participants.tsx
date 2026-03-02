"use client";

import { Users, Circle } from "lucide-react";
import { useStore } from "@/lib/store";

export function Participants() {
  const room = useStore((s) => s.room);

  if (!room) return null;

  const online = room.participants.filter((p) => p.online);
  const offline = room.participants.filter((p) => !p.online);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Users className="h-3.5 w-3.5" />
        <span>
          In Room ({online.length}/{room.participants.length})
        </span>
      </div>
      <div className="space-y-1">
        {online.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: p.color }}
            >
              {p.name[0].toUpperCase()}
            </div>
            <span className="text-sm text-zinc-200">{p.name}</span>
            <Circle className="ml-auto h-2 w-2 fill-green-400 text-green-400" />
          </div>
        ))}
        {offline.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 opacity-50"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: p.color }}
            >
              {p.name[0].toUpperCase()}
            </div>
            <span className="text-sm text-zinc-400">{p.name}</span>
            <Circle className="ml-auto h-2 w-2 text-zinc-600" />
          </div>
        ))}
      </div>
    </div>
  );
}
