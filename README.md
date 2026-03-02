<h1 align="center">clawgether</h1>

<p align="center">
  Your teammate is talking to Claude. You're talking to Claude.<br>
  You're working on the same project. Neither of you knows what the other asked.<br>
  <strong>That's the problem.</strong>
</p>

<p align="center">
  <em>What if you could just... sit in the same conversation?</em>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick_Start-grey?style=for-the-badge" alt="Quick Start" /></a>
  &nbsp;
  <a href="#what-you-actually-get"><img src="https://img.shields.io/badge/Features-grey?style=for-the-badge" alt="Features" /></a>
  &nbsp;
  <a href="#self-hosting"><img src="https://img.shields.io/badge/Self_Host-grey?style=for-the-badge" alt="Self-Host" /></a>
</p>

<p align="center">
  <a href="https://github.com/ofershap/clawgether/actions/workflows/ci.yml"><img src="https://github.com/ofershap/clawgether/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" /></a>
</p>

---

## Two Developers, One Agent

Every tool in this space runs multiple AI agents in parallel. More agents, more tokens, more cost, more conflict.

clawgether does the opposite. It puts multiple humans in the same room with one agent.

You and your teammate open a browser, join the same room, and talk to Claude together. You see each other's messages. You watch Claude's responses stream in real-time. When Claude edits a file, both of you see the diff. When it runs a command, both of you see the output. Claude knows who said what, tracks context per person, and responds to the group.

It's a shared AI session. Google Docs for coding conversations.

```
You (browser)  ──┐
                  ├── WebSocket ──► Server ──► Claude Agent SDK
Friend (browser) ─┘                              │
                                                  ▼
                                          Your project folder
                                          (read, write, terminal)
```

The server runs on your machine. Claude operates on a real project folder with full filesystem access. This isn't a chat wrapper pretending to code.

---

## Quick Start

```bash
git clone https://github.com/ofershap/clawgether.git
cd clawgether
npm install
npm run dev
```

Open `http://localhost:3847`. Create a room, share the link.

Your friend is remote? One more line:

```bash
npx ngrok http 3847
# Share the https://abc123.ngrok-free.app URL
```

That's it. They open the link, type their name, and they're in.

---

## What You Actually Get

### The Chat

| | |
|---|---|
| **Live streaming** | Claude's responses stream to everyone simultaneously |
| **Message queue** | Send a message while Claude is mid-thought. It gets queued, not lost |
| **Typing indicators** | See who's composing. The bouncing dots |
| **@mentions** | Tag a teammate. Autocomplete kicks in after `@` |
| **Reactions** | Quick emoji on any message. The small things matter |
| **Notifications** | Tab title changes, browser notifications when you're alt-tabbed |
| **Markdown** | Full rendering with syntax highlighting. Code blocks look good |

### The Agent

This is the Claude Agent SDK with full capabilities, not a REST wrapper.

| | |
|---|---|
| **File operations** | Read, write, create, delete. Your project, live |
| **Terminal** | Runs shell commands, you see the output |
| **Git awareness** | Branch, uncommitted changes, one-click undo |
| **Code / Ask modes** | Full agent or discussion-only. Toggle in the sidebar |
| **Auto-lint** | Runs your linter after changes |
| **Repo map** | Extracted symbols from your codebase. Claude sees structure |

### The Sidebar

| | |
|---|---|
| **Participants** | Who's online, who's offline |
| **Git status** | Branch, ahead count, last commit |
| **File context** | Which files Claude touched, color-coded by action |
| **Cost tracking** | Per-message estimates. Know what you're spending |
| **Session export** | Download the full conversation as JSON |
| **Claude Code import** | Had a session in Claude Code? Import it into the room |
| **Auto-summary** | One click to summarize the conversation so far |

### Authentication

| Method | How |
|--------|-----|
| **OpenRouter** | One-click OAuth login. Free account, access Claude |
| **API Key** | Paste `sk-ant-...` or `sk-or-...` directly |

Keys live in server memory. Never touch disk.

---

## Why Not Just Share a Screen?

You've tried the alternatives:

- **Screen share** while one person drives. The other person watches, gets bored, checks Slack
- **Take turns**. Lose context every handoff. "Wait, what did you ask it?"
- **Separate sessions**. Both talking to Claude about the same project. Duplicate work, contradicting instructions, wasted tokens

clawgether fixes this because the conversation is the collaboration. Both people contribute. Both people see what's happening. One agent, no conflict, no duplication.

---

## Architecture

| Component | Purpose |
|-----------|---------|
| `server.ts` | HTTP + Socket.io server on top of Next.js |
| `src/server/room-manager.ts` | Room lifecycle, participants, message queue |
| `src/server/agent-session.ts` | Claude Agent SDK, streaming, tool calls |
| `src/server/git-service.ts` | Git status, diff, undo |
| `src/server/cc-sessions.ts` | Parse Claude Code session history |
| `src/components/` | React UI: chat, sidebar, modals |
| `src/lib/store.ts` | Zustand client state |

**Stack:** Next.js 16 · Socket.io · Claude Agent SDK · Zustand · Tailwind · TypeScript (strict)

---

## Self-Hosting

The agent spawns a long-lived process and needs filesystem access. Serverless won't work.

| Platform | Notes |
|----------|-------|
| **Your laptop + ngrok** | Fastest. Zero setup |
| **Railway** | Persistent containers. $5/mo free credit |
| **Fly.io** | Long-running VMs, persistent volumes |
| **Any VPS** | Full control |

```bash
npm run build
npm start
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## Author

Made by [ofershap](https://github.com/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

## License

[MIT](LICENSE) &copy; [Ofer Shapira](https://github.com/ofershap)
