<p align="center">
  <img src="assets/logo.png" alt="clawgether - multiplayer coding rooms with Claude" width="100" height="100" />
</p>

<h1 align="center">clawgether</h1>

<p align="center">
  Multiple developers, one AI agent, real-time. Create a room, invite your team, talk to Claude together. Everyone sees the conversation, the tool calls, the file changes. Like Google Docs, but for AI conversations about code.
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick_Start-grey?style=for-the-badge" alt="Quick Start" /></a>
  &nbsp;
  <a href="#features"><img src="https://img.shields.io/badge/Features-grey?style=for-the-badge" alt="Features" /></a>
  &nbsp;
  <a href="#self-hosting"><img src="https://img.shields.io/badge/Self_Host-grey?style=for-the-badge" alt="Self-Host" /></a>
</p>

<p align="center">
  <a href="https://github.com/ofershap/clawgether/actions/workflows/ci.yml"><img src="https://github.com/ofershap/clawgether/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" /></a>
</p>

---

## The Problem

You and a teammate both use Claude for coding. You're working on the same project. Right now your options are:

- Screen share while one person drives (painful)
- Take turns, lose context every handoff
- Both run separate sessions, duplicate work, contradict each other

Every tool in this space runs multiple AI agents in parallel. clawgether does the opposite: it puts multiple humans in the same room with one agent. You talk to Claude together, see each other's messages, watch responses stream live.

There's no way to sit in the same AI conversation. clawgether fixes that.

![Demo](assets/demo.gif)

<sub>Demo animation created with <a href="https://github.com/ofershap/remotion-readme-kit">remotion-readme-kit</a></sub>

---

## How It Works

```
You (browser)  ──┐
                  ├── WebSocket ──► Server ──► Claude Agent SDK
Friend (browser) ─┘                              │
                                                  ▼
                                          Your project folder
                                          (read, write, terminal)
```

1. Start the server on your machine (or any host)
2. Create a room, point it at a local project folder
3. Share the invite link
4. Your friend opens it, enters their name, done
5. Both of you chat with the same Claude session

Claude sees who said what. Messages are tagged per person so it tracks context across participants.

---

## Features

### Real-Time Collaboration

| Feature | What it does |
|---------|-------------|
| **Live streaming** | Claude's responses stream to everyone simultaneously |
| **Message queue** | Multiple messages get queued, not lost, while Claude is working |
| **Typing indicators** | See when someone is composing a message |
| **@mentions** | Tag teammates with autocomplete |
| **Reactions** | React to messages with emoji |
| **Browser notifications** | Get notified when someone sends a message while you're in another tab |

### Agent Capabilities

This isn't a chat wrapper. The agent runs through the Claude Agent SDK with full capabilities:

| Capability | Details |
|-----------|---------|
| **File operations** | Read, write, create, delete files in your project |
| **Terminal commands** | Run shell commands, see output |
| **Git integration** | Branch info, uncommitted changes, one-click undo |
| **Code/Ask modes** | Switch between full agent mode and discussion-only |
| **Auto-linting** | Runs your linter after changes |
| **Repo map** | Extracted symbols from your codebase for context |

### Session Management

| Feature | Details |
|---------|---------|
| **Session export** | Download the full conversation as JSON |
| **Claude Code import** | Load past Claude Code sessions into the room |
| **Auto-summary** | Generate a conversation summary on demand |
| **Room persistence** | Rooms survive page refreshes, auto-rejoin via URL |
| **Cost tracking** | Per-message cost estimates in the sidebar |

### Authentication

| Method | How | Best for |
|--------|-----|----------|
| **OpenRouter OAuth** | One-click login, no key needed | Getting started fast |
| **API Key** | Paste `sk-ant-...` or `sk-or-...` | Direct Anthropic access |

Keys are held in server memory only. Never written to disk.

---

## Quick Start

```bash
git clone https://github.com/ofershap/clawgether.git
cd clawgether
npm install
npm run dev
```

Open `http://localhost:3847`. Create a room, share the link.

### Share with a remote teammate

```bash
npx ngrok http 3847
# Share the https://abc123.ngrok-free.app URL
```

---

## Architecture

| Component | Purpose |
|-----------|---------|
| `server.ts` | HTTP + Socket.io server, Next.js custom server |
| `src/server/room-manager.ts` | Room lifecycle, participants, message queue |
| `src/server/agent-session.ts` | Claude Agent SDK wrapper, streaming, tool calls |
| `src/server/git-service.ts` | Git status, diff, undo operations |
| `src/server/lint-runner.ts` | Auto-detect and run project linters |
| `src/server/repo-map.ts` | Extract symbols from codebase |
| `src/server/cc-sessions.ts` | Parse Claude Code session history |
| `src/components/` | React UI: chat, sidebar, modals |
| `src/lib/store.ts` | Zustand client state |
| `src/lib/types.ts` | Shared TypeScript interfaces |

### Tech Stack

- **Next.js 16** (App Router) with custom server
- **Socket.io** for real-time WebSocket communication
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) for AI agent
- **Zustand** for client state
- **Tailwind CSS** for styling
- **TypeScript** (strict mode)

---

## Self-Hosting

clawgether needs a persistent server process. Serverless platforms like Vercel won't work because the Claude Agent SDK spawns a long-lived child process and needs filesystem access.

| Platform | Notes |
|----------|-------|
| **Your laptop + ngrok** | Fastest for testing. Zero setup. |
| **Railway** | Persistent containers. $5/mo free credit. |
| **Fly.io** | Long-running VMs, persistent volumes. |
| **Any VPS** | Full control. Docker or bare metal. |

```bash
npm run build
npm start
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Author

Made by [ofershap](https://github.com/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ofer-shapira/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)](https://github.com/ofershap)

## License

MIT
