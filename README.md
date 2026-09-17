# KanbanSync

> **A production-grade, real-time collaborative Kanban board application** built for teams who need visibility, flexibility, and accountability in their task management workflow.

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue?logo=postgresql)](https://www.postgresql.org/)
[![Pusher](https://img.shields.io/badge/Pusher-Real--time-300D4F?logo=pusher)](https://pusher.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 🚀 What is KanbanSync?

KanbanSync is a full-stack, real-time Kanban board application that lets teams collaborate on tasks visually — with changes reflected instantly across all connected browsers via WebSockets. Think Trello or Jira, built from scratch with modern Next.js patterns.

### ✨ Key Features

| Feature | Description |
|---|---|
| 🗂️ **Drag-and-Drop Boards** | Reorder tasks across columns with fluid DnD powered by `@dnd-kit` |
| ⚡ **Real-Time Collaboration** | Every board change is pushed to all members instantly via Pusher WebSockets |
| 🔐 **Role-Based Access Control** | Three-tier role system (Leader, Reviewer, Member) with a centralized permissions matrix |
| 📊 **Metrics & Analytics** | Lead time, cycle time, WIP limits, throughput trends, and Cumulative Flow Diagrams |
| 🔔 **Notification Center** | In-app notification bell with live updates, filter by type, mark-read, and email digests |
| 📋 **Rich Task Details** | Subtasks, attachments, activity feed, time tracking, dependencies, and inline editing |
| 🗃️ **Archive System** | Soft-archive boards and tasks with a configurable 30-day retention window |
| ⏰ **Reminder Scheduler** | Set task reminders that fire as push notifications at a specific date/time |
| 📅 **Cycle Planner** | Group tasks into sprints/cycles for iteration planning |
| 📝 **Task Templates** | Save and reuse task configurations across the board |
| 👤 **Demo Account** | One-click login for exploring the app without registration |
| 🎓 **Guided Onboarding** | Step-by-step tour for new users with a pre-populated example board |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) | Server Components, Server Actions, file-based routing |
| **Language** | TypeScript (strict mode) | End-to-end type safety |
| **Database** | PostgreSQL (hosted on Render) | Relational data model, ACID transactions |
| **ORM** | Prisma 7 (with `@prisma/adapter-pg`) | Type-safe queries, migrations |
| **Auth** | NextAuth v5 | Credentials + Google OAuth |
| **Real-time** | Pusher Channels | Managed WebSockets with fallback |
| **Styling** | Tailwind CSS v4 | Utility-first, JIT compilation |
| **DnD** | @dnd-kit | Accessible, modular drag-and-drop |
| **Deployment** | Vercel | Global edge CDN, serverless functions |

---

## 📁 Project Structure

```text
KanbanSync/
└── kanbansync/                        ← Next.js application root
    ├── src/
    │   ├── actions/                   ← Server Actions (business logic, DB writes)
    │   │   ├── authActions.ts         ← Sign up, sign in, demo login, session management
    │   │   ├── boardActions.ts        ← Board CRUD, archival, column management, settings
    │   │   ├── taskActions.ts         ← Task CRUD, move, archive, restore, bulk operations
    │   │   ├── detailActions.ts       ← Comments, subtasks, attachments, time entries, deps
    │   │   ├── memberActions.ts       ← Board member invitation
    │   │   └── notificationActions.ts ← Notifications, invite handling, digest emails
    │   ├── app/                       ← Next.js App Router pages
    │   │   ├── layout.tsx             ← Root layout, providers
    │   │   ├── page.tsx               ← Root redirect to /dashboard
    │   │   ├── dashboard/page.tsx     ← Authenticated board list
    │   │   ├── board/[boardId]/       ← Dynamic board route
    │   │   ├── login/ & signup/       ← Auth pages
    │   │   └── api/contact/           ← Contact form API route
    │   ├── components/
    │   │   ├── features/board/        ← Core Kanban UI components
    │   │   │   ├── KanbanBoard.tsx    ← Main board orchestrator (DnD, Pusher, filters)
    │   │   │   ├── BoardColumn.tsx    ← Droppable swimlane with WIP enforcement
    │   │   │   ├── SortableTask.tsx   ← Draggable task card
    │   │   │   ├── TaskDetailsModal.tsx ← Full task detail view and editing
    │   │   │   ├── NewTaskModal.tsx   ← Create task form
    │   │   │   ├── FilterPanel.tsx    ← Advanced task filtering UI
    │   │   │   ├── MetricsModal.tsx   ← Analytics charts
    │   │   │   ├── BoardSettingsModal.tsx ← Board configuration
    │   │   │   ├── InviteMemberModal.tsx ← Member invitation
    │   │   │   └── ...               ← Audit, cycle planner, timesheet modals
    │   │   ├── onboarding/            ← Guided tour components
    │   │   └── ui/                    ← Reusable primitives (Modal, Tooltip, etc.)
    │   ├── lib/                       ← Shared utilities and infrastructure
    │   │   ├── db.ts                  ← Singleton Prisma client
    │   │   ├── dataAccessLayer.ts     ← Memoized DB read queries
    │   │   ├── permission.ts          ← getUserRole() helper
    │   │   ├── permissionsMatrix.ts   ← ACTION_MATRIX and canPerformBoardAction()
    │   │   ├── archiveMarkers.ts      ← Archive encoding/decoding for string columns
    │   │   ├── metrics.ts             ← Board analytics computation engine
    │   │   ├── reminders.ts           ← Task reminder and due date notification dispatcher
    │   │   ├── activity.ts            ← Non-blocking task activity logger
    │   │   ├── emailDigest.ts         ← Email digest composer (placeholder transport)
    │   │   ├── pusher.ts              ← Browser Pusher client factory
    │   │   ├── pusher-server.ts       ← Server-side Pusher singleton
    │   │   ├── demoAccount.ts         ← Demo account credentials constant
    │   │   └── onboardingExampleBoard.ts ← Seed data for onboarding boards
    │   ├── hooks/
    │   │   └── usePinnedBoards.ts     ← localStorage-backed board pinning hook
    │   └── types/
    │       └── board.ts               ← Prisma-derived TypeScript types
    ├── prisma/
    │   └── schema.prisma              ← Database schema definition
    ├── auth.ts                        ← NextAuth configuration
    ├── ARCHITECTURE.md                ← Full technical architecture guide
    ├── CONTRIBUTING.md                ← Contributor guide
    └── README.md                      ← This file
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | v18+ |
| npm | v9+ |
| PostgreSQL | v14+ (or use a hosted DB) |

### 1. Clone the Repository

```bash
git clone https://github.com/blue9kamrul/KanbanSync.git
cd KanbanSync/kanbansync
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `kanbansync/` directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kanbansync"

# NextAuth
NEXTAUTH_SECRET="your-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Pusher (required for real-time features)
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="..."
PUSHER_APP_ID="..."
PUSHER_SECRET="..."
```

> **Getting Pusher credentials:** Sign up for free at [pusher.com](https://pusher.com), create a Channels app, and copy the credentials from the app dashboard.

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Apply all migrations to your database
npx prisma migrate dev

# (Optional) Open Prisma Studio to inspect your data
npx prisma studio
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You can sign up for a new account or use the **Demo Account** button to explore a pre-populated board.

---

## 🔐 Authentication

KanbanSync supports two authentication methods:

1. **Email/Password** — credentials are hashed with bcrypt and stored in the database.
2. **Google OAuth** — configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env`.

A **Demo Account** is also available for quick exploration — it logs in as a pre-seeded user with an example board.

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. Push your fork to GitHub.
2. Import the repository in [vercel.com/new](https://vercel.com/new).
3. Set the **Root Directory** to `kanbansync`.
4. Add all environment variables from your `.env` file in the Vercel project settings.
5. Deploy — Vercel handles builds, CDN, and serverless functions automatically.

### Database Hosting

The production database is hosted on [Render](https://render.com). You can use any managed PostgreSQL provider (Supabase, Neon, Railway, etc.) — just update `DATABASE_URL`.

---

## 📖 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — In-depth technical documentation: data flow, component design, security model, performance strategy, and complete Server Actions reference.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute: setup guide, branching strategy, commit conventions, and PR process.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

---

## 📄 License

This project is open-source. See [LICENSE](./LICENSE) for details.

---

*Built by [Kamrul](https://github.com/mkamrul9) — feedback and contributions are always welcome! 🚀*
