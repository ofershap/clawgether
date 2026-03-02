# clawgether

[![CI](https://github.com/ofershap/clawgether/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/clawgether/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

Multiplayer coding rooms with Claude. Multiple developers, one AI agent, real-time.

```bash
npx clawgether
# Open http://localhost:3847, create a room, share the link
```

> Every tool in this space runs multiple AI agents in parallel. clawgether does the opposite - it puts multiple humans in the same room with one agent. You talk to Claude together, see each other's messages, watch responses stream live. Like Google Docs, but for AI conversations about code.

![Demo](assets/demo.gif)

---

## The Problem

You and a teammate both use Claude for coding. You're working on the same project. Right now your options are:

- Screen share while one person drives (painful)
- Take turns, lose context every handoff
- Both run separate sessions, duplicate work, contradict each other

There's no way to sit in the same AI conversation. clawgether fixes that.

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

Claude sees who said what. Messages are tagged `[Ofer]: ...` and `[Dan]: ...` so it tracks context per person.

## Quick Start

```bash
git clone https://github.com/ofershap/clawgether.git
cd clawgether
npm install
npm run dev
```

Open `http://localhost:3847`. Create a room, share the link with your teammate.

### Share with a remote teammate

Your friend needs to reach your machine. Easiest way:

```bash
npx ngrok http 3847
```

This gives you a public URL like `https://abc123.ngrok-free.app`. Share that instead of localhost.

### Authentication

Two options:

| Mode | How | When to use |
|------|-----|-------------|
| Server Auth | Toggle "Server Auth" in the lobby | You're self-hosting and already logged into Claude Code on the machine |
| API Key | Paste your `sk-ant-...` key | Remote deployment, or you don't have Claude Code installed |

Each person's API key is used only for the messages they send. Keys are held in server memory, never written to disk.

## What Claude Can Do

This isn't a chat wrapper. The agent runs through the Claude Agent SDK with full Claude Code capabilities:

- Read and write files in your project
- Run terminal commands
- Search across the codebase
- Git operations

When Claude uses a tool, everyone in the room sees it in a collapsible block - what it ran, what it returned.

## Architecture

| Component | What it does |
|-----------|-------------|
| `server.ts` | HTTP + Socket.io server, Next.js custom server |
| `src/server/room-manager.ts` | Room lifecycle, participant tracking, message queue |
| `src/server/agent-session.ts` | Claude Agent SDK wrapper, streaming, tool call events |
| `src/server/repo-manager.ts` | Validates local project paths |
| `src/components/` | React UI - chat panel, message bubbles, participant sidebar |
| `src/lib/store.ts` | Zustand client state |
| `src/lib/socket.ts` | Socket.io client |

### Message queue

Only one message can be sent to Claude at a time. If someone sends a message while Claude is mid-response, it gets queued. The queue is visible in the UI so nobody's confused about why their message hasn't been answered yet.

## Tech Stack

- Next.js 16 (App Router)
- Socket.io for WebSocket
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- Tailwind CSS
- Zustand
- TypeScript (strict)

## Self-Hosting

clawgether needs a persistent server process - serverless platforms like Vercel won't work. The Claude Agent SDK spawns a long-lived child process and needs filesystem access.

Options that work:

| Platform | Notes |
|----------|-------|
| Your laptop + ngrok | Fastest for testing. Zero setup. |
| Railway | Persistent containers. $5/mo free credit. |
| Fly.io | Long-running VMs, persistent volumes. |
| Any VPS | Full control. Docker or bare metal. |

```bash
# Production
npm run build
npm start
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Code of Conduct

This project uses the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Author

Made by [ofershap](https://github.com/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ofer-shapira/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)](https://github.com/ofershap)

## License

MIT
