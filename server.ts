import { createServer } from "http";
import { readdirSync, statSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { homedir } from "os";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { RoomManager } from "./src/server/room-manager";
import { listCCSessions, parseCCSession } from "./src/server/cc-sessions";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  DirEntry,
} from "./src/lib/types";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3847", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: { origin: "*" },
      maxHttpBufferSize: 1e7,
    }
  );

  const roomManager = new RoomManager(io);

  io.on("connection", (socket) => {
    let currentRoomId: string | null = null;
    let currentParticipantId: string | null = null;
    let currentApiKey: string | null = null;
    let currentParticipantName: string | null = null;

    socket.on("room:create", async (data, cb) => {
      try {
        const { room, participantId } = await roomManager.createRoom(
          data.name,
          data.projectPath,
          data.userName
        );
        currentRoomId = room.id;
        currentParticipantId = participantId;
        currentApiKey = data.apiKey;
        currentParticipantName = data.userName;
        socket.join(room.id);
        roomManager.setParticipantSocket(room.id, participantId, socket, data.apiKey);
        cb(room, participantId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create room";
        socket.emit("error", msg);
      }
    });

    socket.on("room:join", async (data, cb) => {
      try {
        const result = roomManager.joinRoom(data.roomId, data.userName);
        if (!result) {
          cb(null, null, "Room not found");
          return;
        }
        currentRoomId = data.roomId;
        currentParticipantId = result.participantId;
        currentApiKey = data.apiKey;
        currentParticipantName = data.userName;
        socket.join(data.roomId);
        roomManager.setParticipantSocket(
          data.roomId,
          result.participantId,
          socket,
          data.apiKey
        );
        io.to(data.roomId).emit("participant:joined", result.participant);
        io.to(data.roomId).emit("room:update", result.room);
        cb(result.room, result.participantId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to join room";
        cb(null, null, msg);
      }
    });

    socket.on("message:send", (data) => {
      if (!currentRoomId || !currentParticipantId || !currentApiKey) return;
      roomManager.handleMessage(
        currentRoomId,
        currentParticipantId,
        data.content,
        currentApiKey
      );
    });

    socket.on("agent:stop", () => {
      if (!currentRoomId) return;
      roomManager.stopAgent(currentRoomId);
    });

    socket.on("agent:undo", () => {
      if (!currentRoomId || !currentParticipantName) return;
      roomManager.handleUndo(currentRoomId, currentParticipantName);
    });

    socket.on("room:setMode", (data) => {
      if (!currentRoomId || !currentParticipantName) return;
      roomManager.setMode(currentRoomId, data.mode, currentParticipantName);
    });

    socket.on("session:export", (cb) => {
      if (!currentRoomId) {
        cb(null);
        return;
      }
      cb(roomManager.exportSession(currentRoomId));
    });

    socket.on("rooms:list", (cb) => {
      cb(roomManager.listRooms());
    });

    socket.on("typing:start", () => {
      if (!currentRoomId || !currentParticipantId || !currentParticipantName) return;
      roomManager.setTyping(currentRoomId, currentParticipantId, currentParticipantName, true);
    });

    socket.on("typing:stop", () => {
      if (!currentRoomId || !currentParticipantId || !currentParticipantName) return;
      roomManager.setTyping(currentRoomId, currentParticipantId, currentParticipantName, false);
    });

    socket.on("reaction:toggle", (data) => {
      if (!currentRoomId || !currentParticipantId || !currentParticipantName) return;
      roomManager.toggleReaction(currentRoomId, data.messageId, data.emoji, currentParticipantId, currentParticipantName);
    });

    socket.on("summary:request", () => {
      if (!currentRoomId || !currentApiKey || !currentParticipantName) return;
      roomManager.generateSummary(currentRoomId, currentParticipantName, currentApiKey);
    });

    socket.on("cc:list", (data, cb) => {
      try {
        const sessions = listCCSessions(data.projectPath);
        cb(sessions);
      } catch {
        cb([]);
      }
    });

    socket.on("cc:import", (data, cb) => {
      if (!currentRoomId) {
        cb(false, "Not in a room");
        return;
      }
      try {
        const messages = parseCCSession(data.projectPath, data.sessionId, currentRoomId);
        if (messages.length === 0) {
          cb(false, "No messages found in session");
          return;
        }
        roomManager.importMessages(currentRoomId, messages);
        cb(true);
      } catch (err: unknown) {
        cb(false, err instanceof Error ? err.message : "Import failed");
      }
    });

    socket.on("fs:browse", (data, cb) => {
      try {
        const target = data.path === "~" ? homedir() : resolve(data.path);
        if (!existsSync(target) || !statSync(target).isDirectory()) {
          cb([], null);
          return;
        }

        const parentPath = dirname(target) !== target ? dirname(target) : null;
        const raw = readdirSync(target, { withFileTypes: true });

        const entries: DirEntry[] = raw
          .filter((d) => d.isDirectory() && !d.name.startsWith("."))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((d) => {
            const fullPath = join(target, d.name);
            let isGitRepo = false;
            try {
              isGitRepo = existsSync(join(fullPath, ".git"));
            } catch {}
            return { name: d.name, path: fullPath, isDirectory: true, isGitRepo };
          });

        cb(entries, parentPath);
      } catch {
        cb([], null);
      }
    });

    socket.on("disconnect", () => {
      if (currentRoomId && currentParticipantId) {
        roomManager.participantDisconnected(currentRoomId, currentParticipantId);
        const room = roomManager.getRoom(currentRoomId);
        if (room) {
          io.to(currentRoomId).emit("participant:left", currentParticipantId);
          io.to(currentRoomId).emit("room:update", room);
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> clawgether running at http://${hostname}:${port}`);
  });
});
