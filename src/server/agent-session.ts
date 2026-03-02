import { query, type Query } from "@anthropic-ai/claude-agent-sdk";

interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onToolStart: (toolId: string, toolName: string) => void;
  onToolInput: (toolId: string, input: string) => void;
  onToolEnd: (toolId: string, output: string) => void;
}

export class AgentSession {
  private repoPath: string | null;
  private sessionId: string | null = null;
  private abortController: AbortController | null = null;

  constructor(repoPath: string | null) {
    this.repoPath = repoPath;
  }

  async sendMessage(
    prompt: string,
    apiKey: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.abortController = new AbortController();

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
    };

    const isOpenRouter = apiKey.startsWith("sk-or-");
    if (isOpenRouter) {
      env.ANTHROPIC_BASE_URL = "https://openrouter.ai/api";
      env.ANTHROPIC_AUTH_TOKEN = apiKey;
      env.ANTHROPIC_API_KEY = "";
    } else {
      env.ANTHROPIC_API_KEY = apiKey;
    }

    const options: Record<string, unknown> = {
      model: "claude-sonnet-4-20250514",
      cwd: this.repoPath || process.cwd(),
      permissionMode: "bypassPermissions" as const,
      allowDangerouslySkipPermissions: true,
      abortController: this.abortController,
      includePartialMessages: true,
      systemPrompt: {
        type: "preset" as const,
        preset: "claude_code" as const,
        append: [
          "You are in a shared coding room called clawgether.",
          "Multiple developers are collaborating with you simultaneously.",
          "Messages are prefixed with [Username]: to indicate who is speaking.",
          "Address each person by name when responding.",
          "Be concise but thorough. Show code when helpful.",
        ].join(" "),
      },
      env,
      maxTurns: 25,
    };

    if (this.sessionId) {
      (options as Record<string, unknown>).resume = this.sessionId;
    }

    const currentToolIds = new Map<string, string>();
    const toolInputBuffers = new Map<string, string>();

    const q: Query = query({ prompt, options: options as Parameters<typeof query>[0]["options"] });

    const seenToolIds = new Set<string>();
    const completedToolIds = new Set<string>();

    for await (const message of q) {
      if (!this.sessionId && message.session_id) {
        this.sessionId = message.session_id;
      }

      if (message.type === "stream_event") {
        const event = message.event;

        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            const toolId = event.content_block.id;
            const toolName = event.content_block.name;
            currentToolIds.set(String(event.index), toolId);
            toolInputBuffers.set(toolId, "");
            if (!seenToolIds.has(toolId)) {
              seenToolIds.add(toolId);
              callbacks.onToolStart(toolId, toolName);
            }
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            callbacks.onTextDelta(event.delta.text);
          } else if (event.delta.type === "input_json_delta") {
            const toolId = currentToolIds.get(String(event.index));
            if (toolId) {
              const prev = toolInputBuffers.get(toolId) || "";
              toolInputBuffers.set(toolId, prev + event.delta.partial_json);
            }
          }
        } else if (event.type === "content_block_stop") {
          const toolId = currentToolIds.get(String(event.index));
          if (toolId) {
            const inputJson = toolInputBuffers.get(toolId) || "";
            if (inputJson) callbacks.onToolInput(toolId, inputJson);
            currentToolIds.delete(String(event.index));
          }
        }
      } else if (message.type === "assistant") {
        for (const block of (message as { message: { content: Array<Record<string, unknown>> } }).message.content) {
          if (block.type === "tool_use") {
            const toolId = block.id as string;
            const toolName = block.name as string;
            if (!seenToolIds.has(toolId)) {
              seenToolIds.add(toolId);
              callbacks.onToolStart(toolId, toolName);
            }
          } else if (block.type === "tool_result") {
            const toolId = block.tool_use_id as string;
            if (!completedToolIds.has(toolId)) {
              completedToolIds.add(toolId);
              const rawContent = block.content;
              const output = typeof rawContent === "string"
                ? rawContent
                : Array.isArray(rawContent)
                  ? (rawContent as Array<{ type: string; text?: string }>).map((c) => c.type === "text" ? c.text : "").join("")
                  : JSON.stringify(rawContent);
              callbacks.onToolEnd(toolId, output.slice(0, 4000));
            }
          }
        }
      } else if (message.type === "result") {
        break;
      }
    }

    for (const toolId of seenToolIds) {
      if (!completedToolIds.has(toolId)) {
        completedToolIds.add(toolId);
        callbacks.onToolEnd(toolId, "");
      }
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}
