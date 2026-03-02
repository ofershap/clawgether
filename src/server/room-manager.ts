import { Server as SocketIOServer, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { AgentSession } from "./agent-session";
import { GitService } from "./git-service";
import { runLint } from "./lint-runner";
import { buildRepoMap } from "./repo-map";
import { resolveProjectPath } from "./repo-manager";
import type {
  Room,
  RoomMode,
  Participant,
  ChatMessage,
  QueuedMessage,
  FileContextEntry,
  SessionTokenUsage,
  SessionExport,
  Reaction,
  TypingUser,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../lib/types";

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

interface ParticipantSocket {
  socket: Socket;
  apiKey: string;
}

interface RoomState {
  room: Room;
  agentSession: AgentSession | null;
  gitService: GitService | null;
  messageQueue: QueuedMessage[];
  isProcessing: boolean;
  participantSockets: Map<string, ParticipantSocket>;
  colorIndex: number;
  preMessageCommitHash: string | null;
  typingUsers: Map<string, TypingUser>;
  typingTimers: Map<string, ReturnType<typeof setTimeout>>;
  reactions: Map<string, Reaction[]>;
}

export class RoomManager {
  private rooms = new Map<string, RoomState>();
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

  constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  async createRoom(
    name: string,
    projectPath: string | undefined,
    creatorName: string
  ): Promise<{ room: Room; participantId: string }> {
    const roomId = nanoid(10);
    const participantId = nanoid(8);

    const participant: Participant = {
      id: participantId,
      name: creatorName,
      color: COLORS[0],
      joinedAt: Date.now(),
      online: true,
    };

    let resolvedPath: string | null = null;
    let status: "ready" | "error" = "ready";
    const messages: ChatMessage[] = [];
    let gitService: GitService | null = null;

    if (projectPath) {
      try {
        resolvedPath = resolveProjectPath(projectPath);
        messages.push({
          id: nanoid(),
          roomId,
          role: "system",
          participantId: null,
          participantName: null,
          content: `Project opened: ${resolvedPath}`,
          toolCalls: [],
          timestamp: Date.now(),
        });

        gitService = new GitService(resolvedPath);
        const isGit = await gitService.isGitRepo();
        if (!isGit) gitService = null;
      } catch (err: unknown) {
        status = "error";
        const msg = err instanceof Error ? err.message : "Invalid path";
        messages.push({
          id: nanoid(),
          roomId,
          role: "system",
          participantId: null,
          participantName: null,
          content: `Invalid project path: ${msg}`,
          toolCalls: [],
          timestamp: Date.now(),
        });
      }
    }

    const room: Room = {
      id: roomId,
      name,
      projectPath: resolvedPath,
      createdAt: Date.now(),
      participants: [participant],
      messages,
      agentSessionId: null,
      status,
      mode: "code",
      gitStatus: null,
      fileContext: [],
      tokenUsage: { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, messageCount: 0 },
    };

    const state: RoomState = {
      room,
      agentSession: null,
      gitService,
      messageQueue: [],
      isProcessing: false,
      participantSockets: new Map(),
      colorIndex: 1,
      preMessageCommitHash: null,
      typingUsers: new Map(),
      typingTimers: new Map(),
      reactions: new Map(),
    };

    this.rooms.set(roomId, state);

    if (gitService) {
      const gitStatus = await gitService.getStatus();
      if (gitStatus) {
        room.gitStatus = gitStatus;
      }
    }

    if (resolvedPath) {
      const map = buildRepoMap(resolvedPath, new Set());
      setTimeout(() => this.io.to(roomId).emit("repoMap:update", map), 500);
    }

    return { room, participantId };
  }

  joinRoom(
    roomId: string,
    userName: string
  ): { room: Room; participantId: string; participant: Participant } | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;

    const existing = state.room.participants.find(
      (p) => p.name === userName && !p.online
    );

    if (existing) {
      existing.online = true;
      existing.joinedAt = Date.now();
      return { room: state.room, participantId: existing.id, participant: existing };
    }

    const participantId = nanoid(8);
    const participant: Participant = {
      id: participantId,
      name: userName,
      color: COLORS[state.colorIndex % COLORS.length],
      joinedAt: Date.now(),
      online: true,
    };
    state.colorIndex++;
    state.room.participants.push(participant);

    return { room: state.room, participantId, participant };
  }

  setParticipantSocket(
    roomId: string,
    participantId: string,
    socket: Socket,
    apiKey: string
  ) {
    const state = this.rooms.get(roomId);
    if (!state) return;
    state.participantSockets.set(participantId, { socket, apiKey });
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId)?.room || null;
  }

  listRooms(): Array<{ id: string; name: string; participantCount: number; messageCount: number; createdAt: number }> {
    return [...this.rooms.values()].map((state) => ({
      id: state.room.id,
      name: state.room.name,
      participantCount: state.room.participants.filter((p) => p.online).length,
      messageCount: state.room.messages.length,
      createdAt: state.room.createdAt,
    }));
  }

  participantDisconnected(roomId: string, participantId: string) {
    const state = this.rooms.get(roomId);
    if (!state) return;
    const p = state.room.participants.find((p) => p.id === participantId);
    if (p) p.online = false;
    state.participantSockets.delete(participantId);

    const timer = state.typingTimers.get(participantId);
    if (timer) clearTimeout(timer);
    state.typingUsers.delete(participantId);
    state.typingTimers.delete(participantId);
    this.io.to(roomId).emit("typing:update", [...state.typingUsers.values()]);
  }

  setMode(roomId: string, mode: RoomMode, participantName: string) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    state.room.mode = mode;
    this.io.to(roomId).emit("mode:update", mode);

    const msg: ChatMessage = {
      id: nanoid(),
      roomId,
      role: "system",
      participantId: null,
      participantName: null,
      content: `${participantName} switched to ${mode} mode`,
      toolCalls: [],
      timestamp: Date.now(),
    };
    state.room.messages.push(msg);
    this.io.to(roomId).emit("message:new", msg);
  }

  async handleUndo(roomId: string, participantName: string) {
    const state = this.rooms.get(roomId);
    if (!state?.gitService) {
      this.io.to(roomId).emit("undo:result", {
        success: false,
        message: "No git repo connected.",
        participantName,
      });
      return;
    }

    if (state.isProcessing) {
      this.io.to(roomId).emit("undo:result", {
        success: false,
        message: "Agent is busy. Stop it first.",
        participantName,
      });
      return;
    }

    const result = await state.gitService.undoLastCommit();
    this.io.to(roomId).emit("undo:result", {
      ...result,
      undoneCommitHash: result.hash,
      undoneCommitMessage: result.commitMessage,
      participantName,
    });

    if (result.success) {
      const sysMsg: ChatMessage = {
        id: nanoid(),
        roomId,
        role: "system",
        participantId: null,
        participantName: null,
        content: `${participantName} undid last commit: ${result.hash} - ${result.commitMessage}`,
        toolCalls: [],
        timestamp: Date.now(),
      };
      state.room.messages.push(sysMsg);
      this.io.to(roomId).emit("message:new", sysMsg);

      await this.refreshGitStatus(roomId);
    }
  }

  exportSession(roomId: string): SessionExport | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;

    return {
      roomName: state.room.name,
      projectPath: state.room.projectPath,
      participants: state.room.participants.map((p) => p.name),
      messages: state.room.messages.map((m) => ({
        role: m.role,
        participantName: m.participantName,
        content: m.content,
        timestamp: m.timestamp,
        toolCalls: m.toolCalls.map((tc) => `${tc.name}: ${tc.status}`),
      })),
      fileContext: state.room.fileContext,
      tokenUsage: state.room.tokenUsage,
      exportedAt: Date.now(),
    };
  }

  async handleMessage(
    roomId: string,
    participantId: string,
    content: string,
    apiKey: string
  ) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    const participant = state.room.participants.find(
      (p) => p.id === participantId
    );
    if (!participant) return;

    const userMessage: ChatMessage = {
      id: nanoid(),
      roomId,
      role: "user",
      participantId,
      participantName: participant.name,
      content,
      toolCalls: [],
      timestamp: Date.now(),
    };
    state.room.messages.push(userMessage);
    this.io.to(roomId).emit("message:new", userMessage);

    if (state.isProcessing) {
      const queued: QueuedMessage = {
        id: nanoid(),
        participantId,
        participantName: participant.name,
        content,
        apiKey,
        timestamp: Date.now(),
      };
      state.messageQueue.push(queued);
      this.io.to(roomId).emit("queue:update", state.messageQueue);
      return;
    }

    await this.processMessage(roomId, content, participant.name, apiKey);
  }

  private async processMessage(
    roomId: string,
    content: string,
    participantName: string,
    apiKey: string
  ) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    state.isProcessing = true;

    if (state.gitService) {
      state.preMessageCommitHash = await state.gitService.getHeadHash();
    }

    const assistantMessageId = nanoid();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      roomId,
      role: "assistant",
      participantId: null,
      participantName: "Claude",
      content: "",
      toolCalls: [],
      timestamp: Date.now(),
      isStreaming: true,
    };
    state.room.messages.push(assistantMessage);
    this.io.to(roomId).emit("message:new", assistantMessage);

    const editedFiles = new Set<string>();

    try {
      if (!state.agentSession) {
        state.agentSession = new AgentSession(state.room.projectPath);
      }

      const modePrefix = state.room.mode === "ask"
        ? "[ASK MODE - discuss only, do NOT edit files] "
        : "";

      const taggedPrompt = `${modePrefix}[${participantName}]: ${content}`;

      await state.agentSession.sendMessage(taggedPrompt, apiKey, {
        onTextDelta: (text: string) => {
          assistantMessage.content += text;
          this.io.to(roomId).emit("message:stream", {
            messageId: assistantMessageId,
            chunk: text,
          });
        },
        onToolStart: (toolId: string, toolName: string) => {
          const toolCall = {
            id: toolId,
            name: toolName,
            input: "",
            output: null,
            status: "running" as const,
          };
          assistantMessage.toolCalls.push(toolCall);
          this.io.to(roomId).emit("message:toolCall", {
            messageId: assistantMessageId,
            toolCall,
          });
        },
        onToolEnd: (toolId: string, output: string) => {
          const tc = assistantMessage.toolCalls.find((t) => t.id === toolId);
          if (tc) {
            tc.output = output;
            tc.status = "done";
          }
          this.io.to(roomId).emit("message:toolCallUpdate", {
            messageId: assistantMessageId,
            toolCallId: toolId,
            output,
            status: "done",
          });

          const toolName = tc?.name || "";
          if (["Edit", "Write", "Create", "MultiEdit"].some((n) => toolName.includes(n))) {
            try {
              const pathMatch = output.match(/(?:file|path)[:\s]+["']?([^\s"']+)/i);
              if (pathMatch) {
                editedFiles.add(pathMatch[1]);
                this.trackFileContext(roomId, pathMatch[1], "edit", participantName);
              }
            } catch {}
          } else if (toolName.includes("Read")) {
            try {
              const pathMatch = output.match(/(?:file|path)[:\s]+["']?([^\s"']+)/i);
              if (pathMatch) {
                this.trackFileContext(roomId, pathMatch[1], "read", participantName);
              }
            } catch {}
          }
        },
      });

      const inputTokens = Math.ceil(assistantMessage.content.length / 4);
      const outputTokens = Math.ceil(assistantMessage.content.length / 4);
      const cost = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN;

      state.room.tokenUsage.totalInputTokens += inputTokens;
      state.room.tokenUsage.totalOutputTokens += outputTokens;
      state.room.tokenUsage.totalCost += cost;
      state.room.tokenUsage.messageCount++;

      assistantMessage.tokenCount = inputTokens + outputTokens;
      assistantMessage.costEstimate = cost;

      let diffs = undefined;
      if (state.gitService && state.preMessageCommitHash) {
        diffs = await state.gitService.getDiffSinceCommit(state.preMessageCommitHash);
        if (diffs.length > 0) {
          assistantMessage.diff = diffs;
        }
      }

      assistantMessage.isStreaming = false;
      this.io.to(roomId).emit("message:streamEnd", {
        messageId: assistantMessageId,
        tokenCount: assistantMessage.tokenCount,
        costEstimate: assistantMessage.costEstimate,
        diff: diffs,
      });

      this.io.to(roomId).emit("tokenUsage:update", state.room.tokenUsage);

      if (state.room.mode === "code" && editedFiles.size > 0 && state.room.projectPath) {
        const lintResults = runLint(state.room.projectPath, [...editedFiles]);
        if (lintResults.length > 0) {
          this.io.to(roomId).emit("lint:result", lintResults);

          const errorSummary = lintResults
            .map((r) => `${r.file}: ${r.errors.slice(0, 3).join("; ")}`)
            .join("\n");

          const lintMsg: ChatMessage = {
            id: nanoid(),
            roomId,
            role: "system",
            participantId: null,
            participantName: null,
            content: `Lint errors found:\n${errorSummary}`,
            toolCalls: [],
            timestamp: Date.now(),
          };
          state.room.messages.push(lintMsg);
          this.io.to(roomId).emit("message:new", lintMsg);
        }
      }

      await this.refreshGitStatus(roomId);

    } catch (err: unknown) {
      assistantMessage.isStreaming = false;
      const errMsg = err instanceof Error ? err.message : "Agent error";
      assistantMessage.content += `\n\n[Error: ${errMsg}]`;
      this.io.to(roomId).emit("message:streamEnd", {
        messageId: assistantMessageId,
      });
    }

    state.isProcessing = false;

    if (state.messageQueue.length > 0) {
      const next = state.messageQueue.shift()!;
      this.io.to(roomId).emit("queue:update", state.messageQueue);
      await this.processMessage(
        roomId,
        next.content,
        next.participantName,
        next.apiKey
      );
    }
  }

  private trackFileContext(
    roomId: string,
    path: string,
    action: "read" | "edit" | "create" | "delete",
    participantName: string | null
  ) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    const existing = state.room.fileContext.findIndex((f) => f.path === path);
    const entry: FileContextEntry = { path, action, timestamp: Date.now(), participantName };

    if (existing >= 0) {
      state.room.fileContext[existing] = entry;
    } else {
      state.room.fileContext.push(entry);
    }

    this.io.to(roomId).emit("fileContext:update", state.room.fileContext);
  }

  private async refreshGitStatus(roomId: string) {
    const state = this.rooms.get(roomId);
    if (!state?.gitService) return;

    const gitStatus = await state.gitService.getStatus();
    if (gitStatus) {
      state.room.gitStatus = gitStatus;
      this.io.to(roomId).emit("gitStatus:update", gitStatus);
    }
  }

  setTyping(roomId: string, participantId: string, participantName: string, isTyping: boolean) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    const existingTimer = state.typingTimers.get(participantId);
    if (existingTimer) clearTimeout(existingTimer);

    if (isTyping) {
      state.typingUsers.set(participantId, { participantId, participantName });
      const timer = setTimeout(() => {
        state.typingUsers.delete(participantId);
        state.typingTimers.delete(participantId);
        this.io.to(roomId).emit("typing:update", [...state.typingUsers.values()]);
      }, 5000);
      state.typingTimers.set(participantId, timer);
    } else {
      state.typingUsers.delete(participantId);
      state.typingTimers.delete(participantId);
    }

    this.io.to(roomId).emit("typing:update", [...state.typingUsers.values()]);
  }

  toggleReaction(roomId: string, messageId: string, emoji: string, participantId: string, participantName: string) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    let reactions = state.reactions.get(messageId) || [];
    const existing = reactions.find((r) => r.emoji === emoji);

    if (existing) {
      const idx = existing.participantIds.indexOf(participantId);
      if (idx >= 0) {
        existing.participantIds.splice(idx, 1);
        existing.participantNames.splice(idx, 1);
        if (existing.participantIds.length === 0) {
          reactions = reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        existing.participantIds.push(participantId);
        existing.participantNames.push(participantName);
      }
    } else {
      reactions.push({ emoji, participantIds: [participantId], participantNames: [participantName] });
    }

    state.reactions.set(messageId, reactions);

    const msg = state.room.messages.find((m) => m.id === messageId);
    if (msg) msg.reactions = reactions;

    this.io.to(roomId).emit("reaction:update", { messageId, reactions });
  }

  async generateSummary(roomId: string, requestedBy: string, apiKey: string) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    const recentMessages = state.room.messages
      .filter((m) => m.role !== "system")
      .slice(-30)
      .map((m) => `${m.participantName || m.role}: ${m.content.slice(0, 200)}`)
      .join("\n");

    if (!recentMessages) return;

    const sysMsg: ChatMessage = {
      id: nanoid(),
      roomId,
      role: "system",
      participantId: null,
      participantName: null,
      content: `${requestedBy} requested a conversation summary...`,
      toolCalls: [],
      timestamp: Date.now(),
    };
    state.room.messages.push(sysMsg);
    this.io.to(roomId).emit("message:new", sysMsg);

    try {
      if (!state.agentSession) {
        state.agentSession = new AgentSession(state.room.projectPath);
      }

      const summaryPrompt = [
        "[SYSTEM]: Summarize this conversation briefly for someone joining mid-session.",
        "Cover: what the team is working on, key decisions made, current status, and any open questions.",
        "Keep it under 200 words. No preamble.\n\n",
        recentMessages,
      ].join("\n");

      const summaryMessageId = nanoid();
      const summaryMessage: ChatMessage = {
        id: summaryMessageId,
        roomId,
        role: "assistant",
        participantId: null,
        participantName: "Claude",
        content: "",
        toolCalls: [],
        timestamp: Date.now(),
        isStreaming: true,
      };
      state.room.messages.push(summaryMessage);
      this.io.to(roomId).emit("message:new", summaryMessage);

      await state.agentSession.sendMessage(summaryPrompt, apiKey, {
        onTextDelta: (text: string) => {
          summaryMessage.content += text;
          this.io.to(roomId).emit("message:stream", {
            messageId: summaryMessageId,
            chunk: text,
          });
        },
        onToolStart: () => {},
        onToolEnd: () => {},
      });

      summaryMessage.isStreaming = false;
      this.io.to(roomId).emit("message:streamEnd", { messageId: summaryMessageId });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Summary failed";
      const errorSys: ChatMessage = {
        id: nanoid(),
        roomId,
        role: "system",
        participantId: null,
        participantName: null,
        content: `Summary failed: ${errMsg}`,
        toolCalls: [],
        timestamp: Date.now(),
      };
      state.room.messages.push(errorSys);
      this.io.to(roomId).emit("message:new", errorSys);
    }
  }

  importMessages(roomId: string, messages: ChatMessage[]) {
    const state = this.rooms.get(roomId);
    if (!state) return;

    const sysMsg: ChatMessage = {
      id: nanoid(),
      roomId,
      role: "system",
      participantId: null,
      participantName: null,
      content: `Imported ${messages.length} messages from a Claude Code session`,
      toolCalls: [],
      timestamp: Date.now(),
    };
    state.room.messages.push(sysMsg);
    this.io.to(roomId).emit("message:new", sysMsg);

    for (const msg of messages) {
      state.room.messages.push(msg);
      this.io.to(roomId).emit("message:new", msg);
    }

    this.io.to(roomId).emit("room:update", state.room);
  }

  stopAgent(roomId: string) {
    const state = this.rooms.get(roomId);
    if (!state?.agentSession) return;
    state.agentSession.abort();
    state.isProcessing = false;
    state.messageQueue = [];
    this.io.to(roomId).emit("queue:update", []);
  }
}
