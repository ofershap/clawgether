import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { CCSession, ChatMessage } from "../lib/types";
import { nanoid } from "nanoid";

function getProjectDir(projectPath: string): string | null {
  const encoded = projectPath.replace(/\//g, "-");
  const ccDir = join(homedir(), ".claude", "projects", encoded);
  if (existsSync(ccDir)) return ccDir;

  const base = join(homedir(), ".claude", "projects");
  if (!existsSync(base)) return null;

  const dirs = readdirSync(base);
  const match = dirs.find((d) => {
    const decoded = d.replace(/-/g, "/");
    return projectPath.endsWith(decoded) || decoded.endsWith(projectPath);
  });

  return match ? join(base, match) : null;
}

export function listCCSessions(projectPath: string): CCSession[] {
  const dir = getProjectDir(projectPath);
  if (!dir) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const sessions: CCSession[] = [];

  for (const file of files) {
    const fullPath = join(dir, file);
    const sessionId = file.replace(".jsonl", "");

    try {
      const stat = statSync(fullPath);
      const content = readFileSync(fullPath, "utf8");
      const lines = content.split("\n").filter(Boolean);

      let slug = "";
      let firstMessage = "";
      let messageCount = 0;
      let timestamp = stat.mtime.toISOString();

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          if (entry.slug && !slug) slug = entry.slug;
          if (entry.timestamp && !timestamp) timestamp = entry.timestamp;

          if (entry.type === "user") {
            messageCount++;
            if (!firstMessage) {
              const msg = entry.message?.content;
              if (typeof msg === "string") {
                const cleaned = msg.replace(/\[Request interrupted.*?\]/g, "").trim();
                if (cleaned.length > 5) firstMessage = cleaned.slice(0, 120);
              } else if (Array.isArray(msg)) {
                for (const part of msg) {
                  if (part.type === "text") {
                    const cleaned = part.text.replace(/\[Request interrupted.*?\]/g, "").trim();
                    if (cleaned.length > 5) {
                      firstMessage = cleaned.slice(0, 120);
                      break;
                    }
                  }
                }
              }
            }
          } else if (entry.type === "assistant") {
            messageCount++;
          }
        } catch {}
      }

      if (messageCount < 2) continue;

      sessions.push({
        id: sessionId,
        slug: slug || sessionId.slice(0, 8),
        firstMessage: firstMessage || "(no preview)",
        messageCount,
        timestamp,
        sizeKb: Math.round(stat.size / 1024),
      });
    } catch {}
  }

  return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function parseCCSession(
  projectPath: string,
  sessionId: string,
  roomId: string
): ChatMessage[] {
  const dir = getProjectDir(projectPath);
  if (!dir) return [];

  const filePath = join(dir, `${sessionId}.jsonl`);
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  const messages: ChatMessage[] = [];

  const assistantChunks = new Map<string, string>();

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      if (entry.type === "user" && entry.sessionId === sessionId) {
        let text = "";
        const msg = entry.message?.content;

        if (typeof msg === "string") {
          text = msg;
        } else if (Array.isArray(msg)) {
          text = msg
            .filter((p: { type: string }) => p.type === "text")
            .map((p: { text: string }) => p.text)
            .join("\n");
        }

        text = text.replace(/\[Request interrupted.*?\]/g, "").trim();
        if (!text || text.length < 3) continue;

        messages.push({
          id: nanoid(),
          roomId,
          role: "user",
          participantId: null,
          participantName: entry.slug || "CC User",
          content: text.slice(0, 5000),
          toolCalls: [], contentBlocks: [], textSegments: [],
          timestamp: new Date(entry.timestamp).getTime() || Date.now(),
        });
      }

      if (entry.type === "assistant" && entry.sessionId === sessionId) {
        const msgId = entry.message?.id;
        if (!msgId) continue;

        const contentParts = entry.message?.content;
        if (!Array.isArray(contentParts)) continue;

        let text = assistantChunks.get(msgId) || "";
        for (const part of contentParts) {
          if (part.type === "text" && part.text) {
            text += part.text;
          }
        }
        assistantChunks.set(msgId, text);

        const existingIdx = messages.findIndex(
          (m) => m.role === "assistant" && m.participantName === `cc:${msgId}`
        );

        const cleaned = text.trim();
        if (!cleaned) continue;

        const chatMsg: ChatMessage = {
          id: nanoid(),
          roomId,
          role: "assistant",
          participantId: null,
          participantName: "Claude",
          content: cleaned.slice(0, 10000),
          toolCalls: [], contentBlocks: [], textSegments: [],
          timestamp: new Date(entry.timestamp).getTime() || Date.now(),
        };

        if (existingIdx >= 0) {
          messages[existingIdx] = { ...chatMsg, participantName: `cc:${msgId}` };
        } else {
          messages.push({ ...chatMsg, participantName: `cc:${msgId}` });
        }
      }
    } catch {}
  }

  for (const msg of messages) {
    if (msg.participantName?.startsWith("cc:")) {
      msg.participantName = "Claude";
    }
  }

  return messages;
}
