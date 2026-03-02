# Security Policy

## Reporting a Vulnerability

**Do not open public GitHub issues for security vulnerabilities.**

Report through one of these channels:

1. **GitHub Security Advisories (preferred):** [Create a private advisory](https://github.com/ofershap/clawgether/security/advisories/new)
2. **Email:** security@ofershap.dev

### What to include

- Description and potential impact
- Steps to reproduce
- Affected version(s)
- Suggested fix if you have one

### What to expect

- Acknowledgment within 48 hours
- Status update within 7 days
- Coordinated disclosure before any public announcement
- Credit in release notes unless you prefer anonymity

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |

Pre-1.0 project. Fixes go to the latest release only.

## Security Considerations

clawgether runs a server that gives Claude access to your filesystem and terminal. This is by design, but worth understanding:

- The agent runs with the same permissions as the server process
- Anyone with the room link can join and send messages to the agent
- API keys are held in server memory, never persisted to disk
- No data leaves the server except to Anthropic's API
- No telemetry, no analytics

### In scope for reports

- Injection or command execution beyond intended agent scope
- API key leakage (logs, responses, network)
- XSS in the dashboard
- Auth bypass (if room passwords are added later)
- WebSocket event spoofing

### Out of scope

- Vulnerabilities in Anthropic's APIs
- Issues requiring physical access to the host
- The agent doing something destructive when explicitly asked to (that's what it's for)
