"use client";

import { create } from "zustand";
import type {
  Room,
  RoomMode,
  ChatMessage,
  Participant,
  QueuedMessage,
  ToolCallInfo,
  FileContextEntry,
  GitStatus,
  SessionTokenUsage,
  LintResult,
  RepoMapEntry,
  UndoResult,
  FileDiff,
  TypingUser,
  Reaction,
} from "./types";

interface AppState {
  room: Room | null;
  participantId: string | null;
  apiKey: string;
  userName: string;
  messages: ChatMessage[];
  queue: QueuedMessage[];
  connected: boolean;
  joining: boolean;

  fileContext: FileContextEntry[];
  gitStatus: GitStatus | null;
  tokenUsage: SessionTokenUsage;
  lintResults: LintResult[];
  repoMap: RepoMapEntry[];
  lastUndo: UndoResult | null;
  typingUsers: TypingUser[];

  setRoom: (room: Room | null) => void;
  setParticipantId: (id: string | null) => void;
  setApiKey: (key: string) => void;
  setUserName: (name: string) => void;
  setConnected: (connected: boolean) => void;
  setJoining: (joining: boolean) => void;

  addMessage: (message: ChatMessage) => void;
  appendToMessage: (messageId: string, chunk: string) => void;
  endMessageStream: (messageId: string, tokenCount?: number, costEstimate?: number, diff?: FileDiff[]) => void;
  addToolCall: (messageId: string, toolCall: ToolCallInfo) => void;
  updateToolCall: (
    messageId: string,
    toolCallId: string,
    output: string,
    status: "done" | "error"
  ) => void;
  setQueue: (queue: QueuedMessage[]) => void;
  updateParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateRoom: (room: Room) => void;

  setFileContext: (files: FileContextEntry[]) => void;
  setGitStatus: (status: GitStatus) => void;
  setTokenUsage: (usage: SessionTokenUsage) => void;
  setLintResults: (results: LintResult[]) => void;
  setRepoMap: (entries: RepoMapEntry[]) => void;
  setMode: (mode: RoomMode) => void;
  setLastUndo: (result: UndoResult | null) => void;
  setTypingUsers: (users: TypingUser[]) => void;
  updateReactions: (messageId: string, reactions: Reaction[]) => void;
  clearMessages: () => void;
}

export const useStore = create<AppState>((set) => ({
  room: null,
  participantId: null,
  apiKey: typeof window !== "undefined" ? localStorage.getItem("clawgether-api-key") || "" : "",
  userName: typeof window !== "undefined" ? localStorage.getItem("clawgether-username") || "" : "",
  messages: [],
  queue: [],
  connected: false,
  joining: false,

  fileContext: [],
  gitStatus: null,
  tokenUsage: { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, messageCount: 0 },
  lintResults: [],
  repoMap: [],
  lastUndo: null,
  typingUsers: [],

  setRoom: (room) => set({
    room,
    fileContext: room?.fileContext || [],
    gitStatus: room?.gitStatus || null,
    tokenUsage: room?.tokenUsage || { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, messageCount: 0 },
  }),
  setParticipantId: (participantId) => set({ participantId }),
  setApiKey: (apiKey) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("clawgether-api-key", apiKey);
    }
    set({ apiKey });
  },
  setUserName: (userName) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("clawgether-username", userName);
    }
    set({ userName });
  },
  setConnected: (connected) => set({ connected }),
  setJoining: (joining) => set({ joining }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendToMessage: (messageId, chunk) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content: m.content + chunk } : m
      ),
    })),

  endMessageStream: (messageId, tokenCount, costEstimate, diff) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isStreaming: false,
              tokenCount,
              costEstimate,
              diff,
              toolCalls: m.toolCalls.map((tc) =>
                tc.status === "running" ? { ...tc, status: "done" as const } : tc
              ),
            }
          : m
      ),
    })),

  addToolCall: (messageId, toolCall) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, toolCalls: [...m.toolCalls, toolCall] }
          : m
      ),
    })),

  updateToolCall: (messageId, toolCallId, output, status) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              toolCalls: m.toolCalls.map((tc) =>
                tc.id === toolCallId ? { ...tc, output, status } : tc
              ),
            }
          : m
      ),
    })),

  setQueue: (queue) => set({ queue }),

  updateParticipant: (participant) =>
    set((state) => {
      if (!state.room) return {};
      const exists = state.room.participants.some((p) => p.id === participant.id);
      const participants = exists
        ? state.room.participants.map((p) =>
            p.id === participant.id ? participant : p
          )
        : [...state.room.participants, participant];
      return { room: { ...state.room, participants } };
    }),

  removeParticipant: (participantId) =>
    set((state) => {
      if (!state.room) return {};
      return {
        room: {
          ...state.room,
          participants: state.room.participants.map((p) =>
            p.id === participantId ? { ...p, online: false } : p
          ),
        },
      };
    }),

  updateRoom: (room) => set({ room, messages: room.messages }),

  setFileContext: (fileContext) => set({ fileContext }),
  setGitStatus: (gitStatus) => set({ gitStatus }),
  setTokenUsage: (tokenUsage) => set({ tokenUsage }),
  setLintResults: (lintResults) => set({ lintResults }),
  setRepoMap: (repoMap) => set({ repoMap }),
  setMode: (mode) =>
    set((state) => state.room ? { room: { ...state.room, mode } } : {}),
  setLastUndo: (lastUndo) => set({ lastUndo }),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
  updateReactions: (messageId, reactions) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    })),
  clearMessages: () =>
    set({
      messages: [],
      queue: [],
      fileContext: [],
      tokenUsage: { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, messageCount: 0 },
      lintResults: [],
      lastUndo: null,
    }),
}));
