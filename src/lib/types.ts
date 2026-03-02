export type RoomMode = "code" | "ask";

export interface Room {
  id: string;
  name: string;
  projectPath: string | null;
  createdAt: number;
  participants: Participant[];
  messages: ChatMessage[];
  agentSessionId: string | null;
  status: "ready" | "error";
  mode: RoomMode;
  gitStatus: GitStatus | null;
  fileContext: FileContextEntry[];
  tokenUsage: SessionTokenUsage;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
  online: boolean;
}

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  roomId: string;
  role: MessageRole;
  participantId: string | null;
  participantName: string | null;
  content: string;
  toolCalls: ToolCallInfo[];
  timestamp: number;
  isStreaming?: boolean;
  tokenCount?: number;
  costEstimate?: number;
  diff?: FileDiff[];
  reactions?: Reaction[];
}

export interface ToolCallInfo {
  id: string;
  name: string;
  input: string;
  output: string | null;
  status: "running" | "done" | "error";
}

export interface QueuedMessage {
  id: string;
  participantId: string;
  participantName: string;
  content: string;
  apiKey: string;
  timestamp: number;
}

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isGitRepo: boolean;
}

export interface GitStatus {
  branch: string;
  uncommittedCount: number;
  aheadCount: number;
  behindCount: number;
  lastCommitHash: string | null;
  lastCommitMessage: string | null;
}

export interface FileContextEntry {
  path: string;
  action: "read" | "edit" | "create" | "delete";
  timestamp: number;
  participantName: string | null;
}

export interface FileDiff {
  path: string;
  hunks: string;
}

export interface SessionTokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  messageCount: number;
}

export interface UndoResult {
  success: boolean;
  message: string;
  undoneCommitHash?: string;
  undoneCommitMessage?: string;
  participantName: string;
}

export interface LintResult {
  file: string;
  errors: string[];
  fixed: boolean;
}

export interface SessionExport {
  roomName: string;
  projectPath: string | null;
  participants: string[];
  messages: Array<{
    role: MessageRole;
    participantName: string | null;
    content: string;
    timestamp: number;
    toolCalls: string[];
  }>;
  fileContext: FileContextEntry[];
  tokenUsage: SessionTokenUsage;
  exportedAt: number;
}

export interface RepoMapEntry {
  path: string;
  symbols: string[];
  lineCount: number;
  inContext: boolean;
}

export interface Reaction {
  emoji: string;
  participantIds: string[];
  participantNames: string[];
}

export interface TypingUser {
  participantId: string;
  participantName: string;
}

export interface CCSession {
  id: string;
  slug: string;
  firstMessage: string;
  messageCount: number;
  timestamp: string;
  sizeKb: number;
}

export interface ClientToServerEvents {
  "room:create": (
    data: { name: string; projectPath?: string; userName: string; apiKey: string },
    cb: (room: Room, participantId: string) => void
  ) => void;
  "room:join": (
    data: { roomId: string; userName: string; apiKey: string },
    cb: (room: Room | null, participantId: string | null, error?: string) => void
  ) => void;
  "message:send": (data: { content: string }) => void;
  "agent:stop": () => void;
  "agent:undo": () => void;
  "room:setMode": (data: { mode: RoomMode }) => void;
  "session:export": (cb: (data: SessionExport | null) => void) => void;
  "typing:start": () => void;
  "typing:stop": () => void;
  "reaction:toggle": (data: { messageId: string; emoji: string }) => void;
  "summary:request": () => void;
  "rooms:list": (
    cb: (rooms: Array<{ id: string; name: string; participantCount: number; messageCount: number; createdAt: number }>) => void
  ) => void;
  "cc:list": (
    data: { projectPath: string },
    cb: (sessions: CCSession[]) => void
  ) => void;
  "cc:import": (
    data: { sessionId: string; projectPath: string },
    cb: (success: boolean, error?: string) => void
  ) => void;
  "fs:browse": (
    data: { path: string },
    cb: (entries: DirEntry[], parentPath: string | null) => void
  ) => void;
}

export interface ServerToClientEvents {
  "room:update": (room: Room) => void;
  "message:new": (message: ChatMessage) => void;
  "message:stream": (data: { messageId: string; chunk: string }) => void;
  "message:streamEnd": (data: { messageId: string; tokenCount?: number; costEstimate?: number; diff?: FileDiff[] }) => void;
  "message:toolCall": (data: {
    messageId: string;
    toolCall: ToolCallInfo;
  }) => void;
  "message:toolCallUpdate": (data: {
    messageId: string;
    toolCallId: string;
    output: string;
    status: "done" | "error";
  }) => void;
  "queue:update": (queue: QueuedMessage[]) => void;
  "participant:joined": (participant: Participant) => void;
  "participant:left": (participantId: string) => void;
  "fileContext:update": (files: FileContextEntry[]) => void;
  "gitStatus:update": (status: GitStatus) => void;
  "tokenUsage:update": (usage: SessionTokenUsage) => void;
  "undo:result": (result: UndoResult) => void;
  "lint:result": (results: LintResult[]) => void;
  "mode:update": (mode: RoomMode) => void;
  "repoMap:update": (entries: RepoMapEntry[]) => void;
  "typing:update": (users: TypingUser[]) => void;
  "reaction:update": (data: { messageId: string; reactions: Reaction[] }) => void;
  error: (message: string) => void;
}
