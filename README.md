*This project has been created as part of the 42 curriculum by harakoto, kralison, frakotov, trasamiz, aandriam.*

# ft_transcendence

## Description

**ft_transcendence** is a full-stack web application featuring a real-time multiplayer 3D tank battle game. Players can register, customize their tanks, challenge people, chat in real-time, and compete on a global leaderboard. The project is built with Next.js (TypeScript), Prisma ORM, PostgreSQL, Socket.IO, and Three.js, all deployed via Docker with a hardened security stack (Nginx + ModSecurity WAF + HashiCorp Vault).

### Key Features

- Real-time multiplayer 3D tank game (Three.js + Socket.IO)
- Training mode with AI bot opponent
- Private chat system with typing indicators
- Friends system (add, remove, block, online status)
- User profiles with avatar and tank customization
- Leaderboard with XP, wins, kills tracking
- Public REST API with API key authentication and rate limiting
- In-app notification system
- PWA (Progressive Web App) support
- API.md API documentation

---

## Instructions

### Prerequisites

- Make
- Docker
- OpenSSL (for self-signed certificate generation)
- Latest stable Google Chrome

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd <project folder>

# Build and launch everything (certificates, build, run)
make all

# The application will be available at:
# https://localhost:8443
```

### Available Make Targets

- `make all` — Generate certs, build images, and start containers
- `make build` — Build Docker images
- `make up` — Start containers and follow app logs
- `make down` — Stop containers
- `make clean` — Stop containers, remove volumes and images
- `make re` — Full restart (clean + all)

### Environment Variables

Secrets are managed by HashiCorp Vault at runtime.

### Useful Commands

```bash
# Rebuild from scratch
docker compose down -v
docker compose up --build
```

---

## Team Information

### Team Members and Roles

- **harakoto** — PO,Tech Lead, Developer — Architecture decisions, backend API, Socket.IO real-time system
- **kralison** — Developer — Product vision, game integration, game designer, HUD in-game
- **frakotov** — PM, Developer — Project coordination, feature implementation, frontend development and component, UI/UX design
- **aandriam** — Developer — Feature development, testing , AI Developement
- **trasamiz** — PM, Docker infrastructure, Developer — Security stack (Nginx, ModSecurity WAF, HashiCorp Vault)

---

## Project Management

### Organization

- **Task tracking**: GitHub Issues and project board
- **Communication**: Slack for daily sync and quick discussions
- **Branching strategy**: Feature branches merged via pull requests
- **Code reviews**: At least one peer review before merging

### Workflow

1. Tasks were assigned during weekly sync meetings
2. Each member worked on feature branches
3. Regular integration meetings to merge and resolve conflicts
4. Final sprint for security hardening and deployment

---

## Technical Stack

### Frontend

- **Next.js 14** (App Router) — Full-stack React framework with SSR capabilities
- **TypeScript** — Type safety and developer experience
- **Tailwind CSS** — Utility-first CSS framework
- **Three.js** — 3D rendering for the tank game
- **Socket.IO Client** — Real-time bidirectional communication
- **Lucide React** — Icon library
- **Custom Design System** — reusable UI components

### Backend

- **Next.js API Routes** — RESTful API endpoints
- **Custom HTTPS Server** (Node.js `https` module)
- **Socket.IO** — WebSocket server for real-time features
- **NextAuth.js v4** — Authentication with JWT strategy
- **bcryptjs** — Password hashing

### Database

- **PostgreSQL** — Relational database
- **Prisma ORM** — Type-safe database access and migrations

**Why PostgreSQL**: Robust relational database with strong support for complex queries, transactions, and indexing — ideal for the social and game data models.

### Infrastructure & Security

- **Docker / Docker Compose** — Containerization and orchestration
- **Nginx** — Reverse proxy with TLS 1.2/1.3
- **ModSecurity + OWASP CRS** — Web Application Firewall
- **HashiCorp Vault** — Secrets management (DB credentials, NextAuth secret)
- **Make** — Build automation

### Justification for Major Technical Choices

- **Next.js**: Full-stack framework covering both frontend and backend, eliminating the need for a separate backend service. App Router provides modern routing with SSR support.
- **Socket.IO**: Chosen for its reliability over raw WebSockets, room support, and fallback transports.
- **Three.js**: Industry-standard 3D library for the browser, enabling immersive tank battle gameplay.
- **Prisma**: Type-safe ORM with excellent TypeScript integration and migration tooling.
- **Vault**: Industry-standard secrets management, ensuring credentials never touch the repository.

---

## Database Schema

### Entity Relationship Diagram

```
User ─┬──< Friendship >── User
      ├──< ConversationParticipant >── Conversation
      ├──< Message >── Conversation
      ├──< MessageRead >── Message
      ├──< GameHistory
      ├──< ApiKey
      └──< Notification
```

### Models

- **User** — Player accounts with auth credentials, profile info, game stats
- **Friendship** — Friend requests with status (PENDING/ACCEPTED/DECLINED/BLOCKED)
- **Conversation** — Private conversations between two users
- **ConversationParticipant** — Tracks user participation and last read timestamp
- **Message** — Chat messages with content and timestamps
- **MessageRead** — Read receipts for messages
- **GameHistory** — Match records with scores, opponent, winner, duration
- **ApiKey** — API keys for public API access with expiration
- **Notification** — In-app notifications (friend requests, messages, game events)

### Enums

- `FriendshipStatus`: PENDING, ACCEPTED, DECLINED, BLOCKED
- `ConversationType`: PRIVATE
- `NotificationType`: FRIEND_REQUEST, FRIEND_ACCEPTED, FRIEND_DENIED, FRIEND_REMOVED, MESSAGE_RECEIVED

### Indexes

- User: `kills DESC`, `wins DESC`, `xp DESC` (leaderboard queries)
- Friendship: `senderId`, `receiverId`, `status`
- Notification: `userId`, `[userId, isRead]`
- ApiKey: `userId`

---

## Features List

- **User Registration & Login** — Email/password auth with bcrypt hashing and JWT sessions — *harakoto*
- **User Profiles** — Profile page with avatar, username, game stats — *kralison*
- **Tank Customization** — Choose tank color before playing — *kralison*
- **Friends System** — Send/accept/deny/block friend requests, online status — *harakoto*
- **Private Chat** — Real-time messaging between friends via Socket.IO — *harakoto*
- **Chat Typing Indicators** — See when someone is typing — *harakoto*
- **Online Players** — Live list of connected players — *harakoto*
- **3D Tank Game** — Three.js-based tank battle with 2D grid map — *kralison, aandriam*
- **Multiplayer Mode** — Real-time 1v1 tank battles over Socket.IO — *harakoto, kralison*
- **Solo Mode** — Play against an AI bot opponent — *aandriam*
- **Leaderboard** — Ranked by wins, kills, XP with sortable columns — *frakotov*
- **Match History** — View past games with scores and opponents — *frakotov*
- **Notifications** — In-app alerts for friend requests, messages, games — *harakoto*
- **Public API** — RESTful API with API key auth and rate limiting — *harakoto*
- **API documentation** — Interactive API documentation at `/API.md` — *harakoto*
- **PWA** — Installable app with service worker and manifest — *kralison*
- **Privacy Policy** — Full privacy policy page — *kralison*
- **Terms of Service** — Full terms of service page — *kralison*
- **Docker Deployment** — Single-command deployment via Make + Docker Compose — *harakoto*
- **HTTPS** — End-to-end encryption with self-signed certificates — *harakoto*
- **WAF/ModSecurity** — Web Application Firewall with OWASP CRS — *trasamiz*
- **Vault Integration** — Automated secrets management — *trasamiz*
- **Design System** — 13 reusable UI components — *frakotov*

---

## Modules

### Points Summary

1. Use a framework for frontend AND backend (Next.js) — Web — 2 pts (Major) — ✅
2. User interaction (chat, profiles, friends) — Web — 2 pts (Major) — ✅
3. Public API with auth, rate limiting, docs — Web — 2 pts (Major) — ✅
5. ORM for database (Prisma) — Web — 1 pt (Minor) — ✅
6. Notification system — Web — 1 pt (Minor) — ✅
7. PWA with offline support — Web — 1 pt (Minor) — ✅
8. Custom design system (13 components) — Web — 1 pt (Minor) — ✅
9. Standard user management and authentication — User Management — 2 pts (Major) — ✅
10. Game statistics and match history — User Management — 1 pt (Minor) — ✅
11. WAF/ModSecurity + HashiCorp Vault — Cybersecurity — 2 pts (Major) — ✅
12. Web-based multiplayer game (Tank Battle) — Gaming — 2 pts (Major) — ✅
13. Remote players (real-time 1v1) — Gaming — 2 pts (Major) — ✅
14. Game customization (tank color, solo AI mode) — Gaming — 1 pt (Minor) — ✅
15. Gamification (XP, levels, leaderboard) — Gaming — 1 pt (Minor) — ✅

**Total validated: 21 points**

### Module Details

**Web - Framework (Major, 2pts)**
Next.js 14 serves as both frontend (React with App Router) and backend (API routes). TypeScript throughout. Implemented by harakoto and frakotov.

**Web - Real-time (Major, 2pts)**
Socket.IO powers online presence tracking, private chat, game matchmaking, and live game state synchronization. Implemented by harakoto and kralison.

**Web - User Interaction (Major, 2pts)**
Complete social system: private chat with typing indicators, user profiles, friend requests with accept/deny/block, online status tracking. Implemented by harakoto, frakotov.

**Web - Public API (Major, 2pts)**
RESTful API at `/api/public/*` with API key authentication , rate limiting (100 req/min), API documentation at `/API.md`, and multiple CRUD endpoints. Implemented by harakoto.

**Web - ORM (Minor, 1pt)**
Prisma ORM provides type-safe database access, schema management, and migrations for PostgreSQL. Implemented by harakoto , frakotov.

**Web - Notifications (Minor, 1pt)**
In-app notification system supporting friend requests, message alerts, and game events. Stored in database with read/unread state. Full CRUD: creation via `createNotification()` in friend routes, update (mark as read) via PUT, deletion via DELETE endpoint. Implemented by harakoto.

**Web - PWA (Minor, 1pt)**
Progressive Web App with `manifest.json`, service worker (`sw.js`), and installability support. Implemented by kralison.

**Web - Design System (Minor, 1pt)**
13 reusable components: Alert, Avatar, Badge, Button, Card, Dropdown, Input, Loader, Modal, Select, Tabs, Textarea, Toast. Uses `class-variance-authority` for variant management. Implemented by kralison.

**User Management (Major, 2pts)**
Email/password authentication with bcrypt hashing, JWT sessions via NextAuth.js, profile updates, avatar support, friend system with online status, single-session enforcement. Implemented by harakoto, kralison.

**User Management - Game Stats (Minor, 1pt)**
XP tracking, win/loss records, kill/death stats, game history with match details, sortable leaderboard. Implemented by frakotov, aandriam.

**Cybersecurity (Major, 2pts)**
Nginx with ModSecurity (OWASP CRS) as WAF, HashiCorp Vault managing all secrets (DB credentials, NextAuth secret), automated certificate generation. Implemented by trasamiz.

**Gaming - Web-based Game (Major, 2pts)**
3D tank battle game rendered with Three.js, 2D grid-based map system, GLTF tank models, real-time combat mechanics. Implemented by kralison, aandriam.

**Gaming - Remote Players (Major, 2pts)**
Real-time 1v1 multiplayer over Socket.IO with matchmaking lobby, live game state sync, and disconnect handling. Implemented by kralison.

**Gaming - Customization (Minor, 1pt)**
Tank color selection, solo mode with AI bot opponent that simulates human-like behavior. Implemented by aandriam, kralison.

**Gaming - Gamification (Minor, 1pt)**
XP/level system, persistent game statistics (wins, kills, deaths, gamesPlayed), sortable leaderboard, and GameHistory model. **Note**: The data model and UI are fully implemented, but the post-game persistence (updating XP/wins in database after multiplayer matches) is not yet wired in `tankServer.js`. The leaderboard and stats display work correctly with existing data. Implemented by frakotov, harakoto.

---

## Individual Contributions

### harakoto (Hajatiana Kevin Rakotonirina)
- Docker infrastructure (Dockerfile, docker-compose, Makefile)
- Socket.IO real-time server (online presence, chat, game events)
- NextAuth.js authentication system
- Public API with API key auth and rate limiting
- Notification system
- HTTPS server configuration
- Database schema design (Prisma)
- Production deployment setup

### kralison (Kevin Fitahiantsoa Ralison)
- Frontend architecture and UI/UX design
- 3D tank game rendering (Three.js)
- Custom design system (13 reusable components)
- User profile and dashboard pages
- PWA implementation
- Privacy Policy and Terms of Service pages
- Landing page and authentication forms

### frakotov (Fanirisoa Rakotovahiny)
- Project management and coordination
- Friends system UI and logic
- Leaderboard and game statistics pages
- Chat notification system
- Feature integration and testing

### aandriam
- Tank game mechanics and gameplay
- AI bot opponent for solo mode
- Game physics and collision detection
- Testing and bug fixes

### trasamiz
- Security stack: Nginx + ModSecurity WAF configuration
- HashiCorp Vault setup and secrets management
- Docker infrastructure (Dockerfile, docker-compose, Makefile)
- OWASP CRS rule integration
- SSL certificate generation automation
- HTTPS server configuration
- Testing the security

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)
- [ModSecurity Reference Manual](https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual)
- [Docker Documentation](https://docs.docker.com/)
- [ft_transcendence Subject (42)](https://cdn.intra.42.fr/pdf/pdf/198114/en.subject.pdf)

### AI Usage

AI tools were used during development for:
- Debugging assistance and error resolution
- Code review and optimization suggestions
- Documentation drafting
- Boilerplate generation for repetitive patterns (API routes, React components)

All AI-generated code was reviewed, understood, and tested by team members before integration.
