# Contributing

Contributions welcome. Here's how to get going.

## Setup

```bash
git clone https://github.com/ofershap/clawgether.git
cd clawgether
npm install
```

## Development

```bash
npm run dev          # Server + Next.js on localhost:3847
npm run typecheck    # Type checking
npm run lint         # ESLint
npm run build        # Production build
```

## Pull Requests

1. Fork the repo
2. Create a branch (`git checkout -b feat/my-thing`)
3. Make changes
4. Run `npm run typecheck && npm run lint`
5. Push and open a PR

## Project Structure

```
server.ts                      # Custom HTTP + Socket.io server
src/
  server/
    room-manager.ts            # Room state, participant tracking, message queue
    agent-session.ts           # Claude Agent SDK wrapper
    repo-manager.ts            # Local project path validation
  lib/
    types.ts                   # Shared TypeScript types
    store.ts                   # Zustand client state
    socket.ts                  # Socket.io client singleton
  components/
    lobby.tsx                  # Room creation form
    chat-panel.tsx             # Message list and input
    message.tsx                # Individual message rendering
    participants.tsx           # Sidebar participant list
    room-header.tsx            # Room info bar
    room-view.tsx              # Main layout wrapper
  hooks/
    use-socket-events.ts       # Socket.io event handlers
  app/
    page.tsx                   # Landing page
    room/[id]/page.tsx         # Room join page
```
