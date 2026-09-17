# 🟦 KanbanSync — Complete Technical Architecture Documentation

> A production-grade, full-stack collaborative Kanban board application built for real-time project management with role-based access control, metrics analytics, reminder scheduling, and seamless team collaboration.
> Stack: Next.js 16 (App Router) + NextAuth v5 + Prisma ORM → PostgreSQL (Render) + Pusher → deployed on Vercel.

*Document version: 2.0 — Updated 2026-08-05*

---

## Table of Contents

1. [Project Overview & Vision](#1-project-overview--vision)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack — What, Why & How](#3-technology-stack--what-why--how)
4. [Architecture Deep Dive](#4-architecture-deep-dive)
5. [Server Actions — Every File Explained](#5-server-actions--every-file-explained)
6. [Library Layer — Every File Explained](#6-library-layer--every-file-explained)
7. [Frontend — Every File & Component Explained](#7-frontend--every-file--component-explained)
8. [Database Schema & Data Model](#8-database-schema--data-model)
9. [Authentication & Authorization System](#9-authentication--authorization-system)
10. [Real-Time Collaboration with Pusher](#10-real-time-collaboration-with-pusher)
11. [Permissions Matrix & Role System](#11-permissions-matrix--role-system)
12. [Metrics & Analytics Engine](#12-metrics--analytics-engine)
13. [Notification & Reminder System](#13-notification--reminder-system)
14. [Onboarding System](#14-onboarding-system)
15. [All Server Actions: Input → Output Flow](#15-all-server-actions-input--output-flow)
16. [Deployment & CI/CD Pipeline](#16-deployment--cicd-pipeline)
17. [Security Model](#17-security-model)
18. [Performance & Scaling Strategy](#18-performance--scaling-strategy)
19. [Challenges Faced & Solutions Implemented](#19-challenges-faced--solutions-implemented)
20. [What Could Be Better — Future Roadmap](#20-what-could-be-better--future-roadmap)
21. [Environment Variables Reference](#21-environment-variables-reference)
22. [Glossary](#22-glossary)

---

## 1. Project Overview & Vision

**KanbanSync** is a full-stack, collaborative task management platform modelled on the Kanban methodology. It enables teams to visually manage workflows through drag-and-drop boards, columns, and cards — with every change instantly reflected on all collaborators' screens via real-time WebSocket events.

### Who uses KanbanSync?

| Role | What they do |
|------|-------------|
| **Board Owner** | Creates and configures boards. Invites members. Archives or deletes the board. |
| **Leader** | Can manage columns, reassign tasks, edit board settings. Cannot delete the board. |
| **Member** | Can create and move tasks, add comments, upload attachments, set due dates. |
| **Viewer** | Read-only access to a board. Can view tasks and comments but not modify anything. |

### Core Features

1. **Drag-and-drop Kanban boards** — Multiple boards, each with unlimited columns and tasks.
2. **Real-time collaboration** — Changes from any user instantly broadcast to all connected members via Pusher.
3. **Role-based access control** — A centralized permissions matrix governs every board action.
4. **Task detail system** — Each task has a full detail modal: description, subtasks, labels, assignees, due dates, attachments, comments.
5. **Metrics & analytics** — Lead time, cycle time, and cumulative flow diagrams computed from task lifecycle timestamps.
6. **Reminder scheduler** — Tasks with `reminderAt` timestamps trigger in-app push notifications via Pusher.
7. **Notification center** — Every board event (task assignment, comment, status change) creates a persisted notification.
8. **Email digests** — Aggregated unread notifications sent as nightly email summaries.
9. **Onboarding flow** — New users land on a pre-populated example board so they understand the UI immediately.
10. **Archive system** — Boards and tasks can be archived rather than permanently deleted.
11. **Demo account** — A single-click login for public demos without requiring account creation.

### Architecture Philosophy

> **Server-first, type-safe, zero client secrets.**

KanbanSync runs almost all business logic on the server through **Next.js Server Actions**. There is no separate REST API backend — the Next.js process acts as both the web server and the application server. Every database query uses **Prisma**, ensuring type-safety from schema to UI. Secrets (database URLs, Pusher credentials) never leave the server environment. The client only holds the Pusher public key, which is intentionally non-secret.

---

## 2. Repository Structure

```text
KanbanSync/                              <- Monorepo root
├── ARCHITECTURE.md                      <- This document
├── package.json                         <- Root package (workspace manager)
│
└── kanbansync/                          <- Main Next.js application
    ├── src/
    │   ├── app/                         <- Next.js App Router (file-based routing)
    │   │   ├── layout.tsx               <- Root layout (ThemeProvider, SessionProvider, Toaster)
    │   │   ├── page.tsx                 <- Landing / redirect page
    │   │   ├── globals.css              <- Global styles + Tailwind base + CSS variables
    │   │   ├── error.tsx                <- Route-level error boundary
    │   │   ├── not-found.tsx            <- 404 page
    │   │   ├── login/                   <- Sign-in page
    │   │   │   └── page.tsx
    │   │   ├── signup/                  <- Sign-up page
    │   │   │   └── page.tsx
    │   │   ├── dashboard/               <- Authenticated board list page
    │   │   │   └── page.tsx
    │   │   ├── board/                   <- Board-level routes
    │   │   │   └── [boardId]/
    │   │   │       ├── page.tsx         <- Full Kanban board view
    │   │   │       └── layout.tsx       <- Board-scoped layout (loads board metadata)
    │   │   ├── about/                   <- Static about page
    │   │   ├── contact/                 <- Contact form page
    │   │   ├── help/                    <- Help & documentation page
    │   │   └── api/                     <- Next.js API routes
    │   │       └── auth/[...nextauth]/  <- NextAuth v5 API handler
    │   │           └── route.ts
    │   │
    │   ├── actions/                     <- Server Actions (business logic layer)
    │   │   ├── authActions.ts           <- Sign-in, sign-up, session helpers
    │   │   ├── boardActions.ts          <- Board CRUD, settings, member invitations
    │   │   ├── taskActions.ts           <- Task CRUD, column moves, due dates, labels
    │   │   ├── detailActions.ts         <- Comments, subtasks, attachments, task detail updates
    │   │   ├── memberActions.ts         <- Member role changes, invitation acceptance, removal
    │   │   └── notificationActions.ts  <- Notification creation, read receipts, digest dispatch
    │   │
    │   ├── lib/                         <- Shared server-side utilities
    │   │   ├── db.ts                    <- Prisma client singleton
    │   │   ├── pusher-server.ts         <- Server-only Pusher instance for triggering events
    │   │   ├── pusher.ts                <- Browser-safe Pusher client factory
    │   │   ├── permissionsMatrix.ts     <- Role x Action permission map (ACTION_MATRIX)
    │   │   ├── permission.ts            <- getUserRole() helper querying BoardMember table
    │   │   ├── metrics.ts               <- Lead time, cycle time, cumulative flow calculations
    │   │   ├── reminders.ts             <- Reminder scheduler: scan + trigger overdue tasks
    │   │   ├── archiveMarkers.ts        <- Soft-delete helpers for boards and tasks
    │   │   ├── activity.ts              <- Activity log formatters
    │   │   ├── dataAccessLayer.ts       <- Reusable Prisma read helpers (DAL pattern)
    │   │   ├── emailDigest.ts           <- Email digest composition + Nodemailer dispatch
    │   │   ├── demoAccount.ts           <- Demo account ID constant
    │   │   └── onboardingExampleBoard.ts <- Pre-built board template for new users
    │   │
    │   ├── components/                  <- React components
    │   │   ├── ui/                      <- Generic Radix UI / Shadcn primitives
    │   │   │   ├── button.tsx
    │   │   │   ├── input.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   ├── dropdown-menu.tsx
    │   │   │   ├── badge.tsx
    │   │   │   ├── avatar.tsx
    │   │   │   ├── tooltip.tsx
    │   │   │   └── ... (30+ primitives)
    │   │   ├── features/
    │   │   │   └── board/               <- Board-specific feature components
    │   │   │       ├── KanbanBoard.tsx  <- Main drag-and-drop orchestrator
    │   │   │       ├── Column.tsx       <- Column with task list + add-task button
    │   │   │       ├── TaskCard.tsx     <- Compact task card (labels, due date, avatar)
    │   │   │       ├── TaskDetailModal.tsx <- Full task detail overlay
    │   │   │       ├── BoardHeader.tsx  <- Board title, members, settings menu
    │   │   │       ├── BoardSidebar.tsx <- Navigation, metrics shortcuts
    │   │   │       └── MemberManager.tsx <- Invite members, change roles, remove
    │   │   └── onboarding/             <- Onboarding wizard components
    │   │       └── OnboardingFlow.tsx
    │   │
    │   ├── hooks/                       <- Custom React hooks
    │   │   ├── useBoardRealtime.ts      <- Pusher subscription + cache invalidation
    │   │   ├── usePermissions.ts        <- Client-side role check hook
    │   │   └── useMetrics.ts            <- Metrics data fetcher hook
    │   │
    │   ├── types/                       <- Shared TypeScript type definitions
    │   │   ├── board.ts                 <- Board, Column, Task, Member interfaces
    │   │   ├── notification.ts          <- Notification type definitions
    │   │   └── metrics.ts               <- Metrics data shapes
    │   │
    │   ├── scripts/                     <- Utility scripts
    │   │   └── seed.ts                  <- Database seed (demo data + admin user)
    │   │
    │   └── generated/                   <- Auto-generated Prisma client types (never edit)
    │
    ├── prisma/
    │   ├── schema.prisma                <- Authoritative Prisma schema (all models)
    │   └── migrations/                  <- Sequential DB migration files
    │
    ├── public/                          <- Static assets
    │   ├── logo.svg
    │   └── og-image.png                 <- Open Graph social preview image
    │
    ├── auth.config.ts                   <- NextAuth v5 provider + callback configuration
    ├── middleware.ts                     <- Next.js edge middleware (route protection)
    ├── next.config.js                   <- Next.js configuration (image domains, env)
    ├── tailwind.config.ts               <- Tailwind CSS configuration + custom tokens
    ├── tsconfig.json                    <- TypeScript compiler settings
    └── package.json                     <- Dependencies & npm scripts
```

---

## 3. Technology Stack — What, Why & How

### Core Runtime & Framework

| Technology | Version | What it is | Why we chose it |
|---|---|---|---|
| **Next.js** | 16.x | React meta-framework | App Router enables nested layouts, server components, and built-in Server Actions — eliminating the need for a separate API server entirely |
| **React** | 19.x | UI component library | Concurrent features, server components, and Suspense for seamless loading states |
| **TypeScript** | ^5 | Typed JavaScript superset | End-to-end type safety from Prisma schema to Server Action return types to component props |
| **Node.js** | 18+ | JavaScript runtime | Long-term support, stable native fetch, and first-class support in Vercel Edge runtime |

### Database & ORM

| Technology | Version | What it is | Why we chose it |
|---|---|---|---|
| **PostgreSQL** | 15+ | Relational database | ACID transactions required for atomic task moves with metric timestamp updates |
| **Prisma ORM** | ^5.x | Type-safe DB client | Auto-generated types from schema, declarative migrations, and include/select for query optimization |
| **Prisma Adapter (NextAuth)** | — | Session persistence | Reuses the existing DB connection — no Redis or separate session store required |

### Authentication

| Technology | Version | What it is | Why we chose it |
|---|---|---|---|
| **NextAuth v5** | ^5.x | Authentication library | Built-in OAuth providers, Prisma adapter for DB-backed sessions, Edge-compatible JWT strategy |
| **bcryptjs** | — | Password hashing | Industry-standard bcrypt for credentials-based sign-in |

### Real-Time

| Technology | Version | What it is | Why we chose it |
|---|---|---|---|
| **Pusher** | ^5.x (server) | Managed WebSocket pub/sub | Scales to thousands of concurrent connections without managing WebSocket infrastructure |
| **pusher-js** | ^8.x (client) | Browser Pusher client | Subscribes to named channels, handles reconnect logic automatically |

### Styling & UI

| Technology | Version | What it is | Why we chose it |
|---|---|---|---|
| **Tailwind CSS** | ^4.x | Utility-first CSS | Rapid prototyping, dark mode via class strategy, no CSS file proliferation |
| **Radix UI** | — | Headless accessible primitives | Dialog, Dropdown, Tooltip — fully accessible without visual opinions |
| **Shadcn UI** | — | Radix + Tailwind component registry | Pre-built, copy-paste components styled with Tailwind — fully owned code |
| **Lucide React** | — | SVG icon library | Tree-shakable, consistent icon set |

### Productivity & DX

| Technology | Version | What it is | Why we chose it |
|---|---|---|---|
| **Zod** | ^3.x | Runtime schema validation | Validates Server Action inputs, preventing invalid data reaching Prisma |
| **date-fns** | ^4.x | Date utilities | Lightweight alternatives to Moment.js for formatting and arithmetic |
| **Sonner** | ^2.x | Toast notifications | Accessible, auto-dismissing toasts for server action feedback |
| **Recharts** | — | Data visualization | Renders metrics dashboard charts (cumulative flow, cycle time histograms) |
| **Nodemailer** | — | Email transport | SMTP-based email for digest notifications and reminders |

---

## 4. Architecture Deep Dive

### The Unified Next.js Server Model

KanbanSync has **no separate backend service**. All business logic runs inside Next.js Server Actions. This means:

- **One deployment target** — Vercel handles both the React UI and the server-side logic
- **No CORS issues** — Client and server are on the same domain
- **Automatic code splitting** — Server Action code never ships to the browser bundle
- **Type-safe RPC** — TypeScript types flow end-to-end from server to client

```
+---------------------------------------------------------------------+
|                     USER'S BROWSER (Vercel Edge)                    |
|                                                                     |
|  Next.js React Client Components                                    |
|  +-- KanbanBoard.tsx    (drag-and-drop, optimistic updates)         |
|  +-- TaskDetailModal.tsx (comments, subtasks, attachments)          |
|  +-- Dashboard           (board list, create board)                 |
|                                                                     |
|  useBoardRealtime()  <- pusher-js subscribes to board channel       |
|  useSession()        <- NextAuth client session hook                |
|  Server Action calls <- typed async function calls                  |
+---------------------------+-----------------------------------------+
                            | Server Actions (HTTP POST to same origin)
                            | Pusher WebSocket (pusher.com to client)
+---------------------------v-----------------------------------------+
|                  NEXT.JS SERVER (Vercel Node.js Runtime)            |
|                                                                     |
|  middleware.ts                                                      |
|  +-- NextAuth session check -> redirect unauthenticated requests    |
|                                                                     |
|  Server Actions (src/actions/*)                                     |
|  +-- authActions.ts      (sign-in, sign-up, session)                |
|  +-- boardActions.ts     (board CRUD, invitations)                  |
|  +-- taskActions.ts      (task CRUD, moves, metrics)                |
|  +-- detailActions.ts    (comments, subtasks, attachments)          |
|  +-- memberActions.ts    (role management, removal)                 |
|  +-- notificationActions.ts (notifications, reminders, digests)     |
|                                                                     |
|  Library Layer (src/lib/*)                                          |
|  +-- db.ts               (Prisma client singleton)                  |
|  +-- permissionsMatrix.ts (ACTION_MATRIX authorization)             |
|  +-- pusher-server.ts    (trigger Pusher events)                    |
|  +-- metrics.ts          (lead/cycle time analytics)                |
|  +-- reminders.ts        (task reminder scheduler)                  |
|                                                                     |
|  Prisma ORM -> PostgreSQL (Render)                                  |
+---------------------------------------------------------------------+
                            |
                    +-------v--------+
                    |  PostgreSQL DB  |
                    |  (Render)       |
                    +----------------+
```

### Request Lifecycle: Every Server Action Call

```
User interacts with UI (e.g., drags a task to a new column)
       |
       v
Client component calls Server Action:
  moveTask(taskId, targetColumnId, boardId)
       |
       v
Next.js serializes the call as a POST to same-origin
       |
       v
middleware.ts (Next.js edge)
  -> auth() validates session JWT
  -> If no session: redirect("/login")
       |
       v
Server Action function executes on Node.js runtime
  1. getUserRole(boardId) -> queries BoardMember table for current user
  2. canPerformBoardAction(role, 'MOVE_TASK') -> checks ACTION_MATRIX
  3. If forbidden: throws AuthorizationError
  4. prisma.task.update({ columnId, startedAt/completedAt timestamps })
  5. RecordMetricSnapshot() -> updates BoardMetric
  6. pusherServer.trigger(`board-${boardId}`, 'task-moved', payload)
  7. notificationActions.createNotification(assigneeId, 'TASK_MOVED', ...)
  8. return { success: true, task: updatedTask }
       |
       v
Client receives typed return value
  -> Optimistically updates React state
  -> All other connected clients receive Pusher event
  -> Pusher subscribers update their own React state
```

### Middleware Guard (Edge Runtime)

`middleware.ts` runs on Vercel's Edge Network — before any server-side rendering. It intercepts every request to a protected route and validates the NextAuth session JWT without touching the database.

```typescript
// middleware.ts
export { auth as middleware } from './auth';

export const config = {
  matcher: ['/dashboard/:path*', '/board/:path*'],
};
```

Protected routes: `/dashboard`, `/board/[boardId]`. Public routes: `/login`, `/signup`, `/about`, `/contact`, `/help`, `/api/auth/*`.

---

## 5. Server Actions — Every File Explained

### `src/actions/authActions.ts`

Thin wrappers around NextAuth's core functions. Contains:

- **`signInAction(email, password)`** — Calls `signIn("credentials", ...)`. Returns `{ success, error }` so the client can show form validation without a full page redirect.
- **`signUpAction(name, email, password)`** — Creates a new `User` record via `prisma.user.create`, then immediately triggers the onboarding flow by calling `createOnboardingBoard(userId)` from `onboardingExampleBoard.ts`.
- **`getSession()`** — Server-side session retrieval using `auth()`. Used inside Server Actions that need to know the current user without passing it as a parameter.

**Why not use NextAuth's built-in callbacks for sign-up?** NextAuth's `signIn` callback runs after every sign-in, including returning users. By handling sign-up explicitly in a Server Action, we can trigger one-time onboarding logic cleanly.

---

### `src/actions/boardActions.ts` — 19KB, Most Complex Action File

This file is the heart of board management. Every function guards itself with `getUserRole()` + `canPerformBoardAction()` before any DB write.

#### `createBoard(title, description, color)`

```
1. getSession() -> userId
2. prisma.board.create({ ownerId: userId, ... })
3. prisma.boardMember.create({ boardId, userId, role: 'OWNER' })
4. Create default columns: ["To Do", "In Progress", "Done"]
5. pusherServer.trigger(`user-${userId}`, 'board-created', { boardId })
6. return { boardId }
```

#### `getBoardWithDetails(boardId)`

Called by the board page's `async` server component. Returns the full board object with all columns, tasks (including assignee info), members, and archived status in a single Prisma query using deep `include`. This is the most expensive query in the app — results are cached via React's server component memoization.

```typescript
const board = await prisma.board.findUnique({
  where: { id: boardId, isArchived: false },
  include: {
    columns: {
      where: { isArchived: false },
      orderBy: { position: 'asc' },
      include: {
        tasks: {
          where: { isArchived: false },
          orderBy: { position: 'asc' },
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            labels: true,
            subtasks: { select: { id: true, title: true, isCompleted: true } },
            _count: { select: { comments: true, attachments: true } },
          },
        },
      },
    },
    members: {
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    },
  },
});
```

#### `updateBoardSettings(boardId, settings)`

Allows OWNER and LEADER roles to update board title, description, cover color, and visibility. Emits `board-updated` Pusher event so all members' sidebar reflects the change.

#### `archiveBoard(boardId)` / `deleteBoard(boardId)`

- `archiveBoard`: Sets `isArchived: true`. Board disappears from dashboard but data is preserved. OWNER only.
- `deleteBoard`: Hard delete with cascade (columns → tasks → comments → attachments). Checks if any active tasks are assigned to members, warns before deletion. OWNER only.

#### `inviteMember(boardId, email, role)`

```
1. Verify caller is OWNER or LEADER
2. Find user by email in User table
3. If not found: create a pending invitation
4. prisma.boardMember.create({ boardId, userId, role })
5. createNotification(invitedUserId, 'BOARD_INVITATION', { boardId, boardTitle })
6. pusherServer.trigger(`user-${invitedUserId}`, 'invitation-received', { ... })
```

#### `getMyBoards()`

Returns all boards the current user is a member of, ordered by last activity. Uses `dataAccessLayer.ts` for caching.

---

### `src/actions/taskActions.ts` — 25KB, Largest File

The most feature-rich action file. Handles the full task lifecycle.

#### `createTask(boardId, columnId, title, position)`

```
1. Permission check: 'CREATE_TASK'
2. prisma.task.create({ columnId, title, position, createdById: userId })
3. Activity log entry
4. pusherServer.trigger(`board-${boardId}`, 'task-created', { task })
5. return task
```

#### `moveTask(taskId, targetColumnId, newPosition)`

The most performance-critical action. When a user drags a task:

```
1. Permission check: 'MOVE_TASK'
2. Fetch current task (sourceColumnId, position, startedAt, completedAt)
3. Determine column type by name:
   - "In Progress" -> set startedAt = now() if not already set
   - "Done" / "Completed" -> set completedAt = now()
4. Reorder tasks in source column (decrement positions > oldPosition)
5. Reorder tasks in target column (increment positions >= newPosition)
6. Update task: { columnId: targetColumnId, position: newPosition, startedAt, completedAt }
7. All 4 operations wrapped in prisma.$transaction([...]) for atomicity
8. RecordMetricSnapshot(boardId) -- async, non-blocking
9. pusherServer.trigger(`board-${boardId}`, 'task-moved', { taskId, targetColumnId, newPosition })
```

**Why a transaction for position reordering?** If the server crashes between steps 4 and 6, you'd end up with two tasks at the same position — a data integrity violation. The transaction rolls everything back.

#### `updateTaskDueDate(taskId, dueDate, reminderAt)`

Sets both `dueAt` and `reminderAt`. The reminder scheduler (`reminders.ts`) periodically scans for tasks where `reminderAt <= now() AND reminderSentAt IS NULL` and fires notifications.

#### `deleteTask(taskId)`

Soft-delete via `archiveMarkers.ts`: sets `isArchived: true` rather than hard-deleting. Preserves comment history and metric data.

#### `assignTask(taskId, assigneeId)`

```
1. Permission check: 'ASSIGN_TASK'
2. prisma.task.update({ assigneeId })
3. createNotification(assigneeId, 'TASK_ASSIGNED', { taskId, taskTitle, boardTitle })
4. pusherServer.trigger(`board-${boardId}`, 'task-assigned', { taskId, assigneeId })
```

#### `addLabel(taskId, labelName, color)` / `removeLabel(taskId, labelId)`

Labels are a many-to-many relationship between `Task` and `Label`. These actions manage the join table.

---

### `src/actions/detailActions.ts` — 20KB

Handles all task-level detail operations invoked from `TaskDetailModal.tsx`.

#### `addComment(taskId, content)`

```
1. Authenticate: getSession()
2. prisma.comment.create({ taskId, authorId: userId, content })
3. Notify task assignee if different from commenter
4. pusherServer.trigger(`task-${taskId}`, 'comment-added', { comment })
5. return comment
```

Pusher emits on a **task-level channel** (`task-${taskId}`) rather than the board channel. This avoids unnecessary re-renders for users not viewing the task detail modal.

#### `updateTaskDescription(taskId, description)`

Markdown-safe update. Triggers `task-updated` event with only the changed fields.

#### `addSubtask(taskId, title)` / `toggleSubtask(subtaskId)`

Subtasks are `SubTask` records linked to a parent `Task`. Toggling updates `isCompleted`. The task card's subtask progress bar updates in real-time.

#### `uploadAttachment(taskId, formData)`

```
1. Extract file from FormData (filename, type, size)
2. Validate: size < 10MB, allowed MIME types
3. Upload to Cloudinary (or local storage in dev)
4. prisma.attachment.create({ taskId, url, filename, size })
5. Emit 'attachment-added' event
```

---

### `src/actions/memberActions.ts`

#### `changeMemberRole(boardId, memberId, newRole)`

```
1. Verify caller is OWNER
2. Cannot change own role (prevent owner lock-out)
3. Cannot change another OWNER's role without transferring ownership first
4. prisma.boardMember.update({ role: newRole })
5. Notify affected member
6. pusherServer.trigger(`board-${boardId}`, 'member-role-changed', { memberId, newRole })
```

#### `removeMember(boardId, memberId)`

```
1. Verify caller is OWNER or LEADER
2. LEADER cannot remove another LEADER (can only remove MEMBERs and VIEWERs)
3. Unassign all tasks assigned to the removed member on this board
4. prisma.boardMember.delete({ boardId, userId: memberId })
5. Emit 'member-removed' event
```

#### `leaveBoard(boardId)`

A member removing themselves. Cannot be used by the sole OWNER (would leave an ownerless board). If OWNER wants to leave, they must transfer ownership first.

---

### `src/actions/notificationActions.ts`

#### `createNotification(userId, type, data)`

Core notification creation. Called from all other action files.

```typescript
await prisma.notification.create({
  data: {
    userId,
    type,              // 'TASK_ASSIGNED' | 'COMMENT_ADDED' | 'BOARD_INVITATION' | ...
    title: data.title,
    body: data.body,
    linkUrl: data.linkUrl,
    isRead: false,
  },
});
// Emit to user's personal Pusher channel
await pusherServer.trigger(`user-${userId}`, 'notification', { type, title: data.title });
```

#### `markNotificationRead(notificationId)` / `markAllRead()`

Updates `isRead: true`. The notification bell badge count is derived from `SELECT COUNT(*) WHERE isRead = false`.

#### `sendNotificationDigestNow(userId)`

Called by a cron-like scheduler. Fetches all unread notifications for the user, formats them into an HTML email via `emailDigest.ts`, and dispatches via Nodemailer. Sets `isDigestSent: true` on each notification to prevent re-sending.

---

## 6. Library Layer — Every File Explained

### `src/lib/db.ts`

The **Prisma client singleton**. Ensures exactly one Prisma instance exists in the Node.js process, even across Next.js hot-reloads in development.

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Why singleton?** Next.js development mode HMR re-evaluates module files on every save. Without the global guard, each hot-reload would create a new Prisma client and open a new connection pool — eventually exhausting PostgreSQL's connection limit.

---

### `src/lib/pusher-server.ts`

```typescript
import Pusher from 'pusher';

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});
```

This file is **server-only** — it imports the `pusher` Node.js package which uses `http`/`https` modules unavailable in the browser. It must never be imported by a client component. Next.js enforces this via the `server-only` package pattern.

**How events flow:**

```
Server Action -> pusherServer.trigger(channel, event, data)
             -> Pusher.com API (HTTPS POST)
             -> Pusher routes event to all subscribed clients
             -> pusher-js client receives event
             -> Client component handler runs
```

---

### `src/lib/pusher.ts`

```typescript
import PusherClient from 'pusher-js';

let client: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!client) {
    client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return client;
}
```

A lazy-initialized singleton. Returns the same `PusherClient` instance on every call. This prevents multiple WebSocket connections if `getPusherClient()` is called from different components on the same page.

---

### `src/lib/permissionsMatrix.ts`

The **centralized authorization system**. Defines `ACTION_MATRIX`:

```typescript
export const ACTION_MATRIX: Record<BoardRole, Set<BoardAction>> = {
  OWNER: new Set([
    'CREATE_TASK', 'MOVE_TASK', 'DELETE_TASK', 'ASSIGN_TASK',
    'CREATE_COLUMN', 'DELETE_COLUMN', 'RENAME_COLUMN',
    'INVITE_MEMBER', 'REMOVE_MEMBER', 'CHANGE_MEMBER_ROLE',
    'UPDATE_BOARD_SETTINGS', 'ARCHIVE_BOARD', 'DELETE_BOARD',
    'ADD_COMMENT', 'ADD_ATTACHMENT', 'MANAGE_LABELS',
  ]),
  LEADER: new Set([
    'CREATE_TASK', 'MOVE_TASK', 'DELETE_TASK', 'ASSIGN_TASK',
    'CREATE_COLUMN', 'DELETE_COLUMN', 'RENAME_COLUMN',
    'INVITE_MEMBER', 'REMOVE_MEMBER',
    'UPDATE_BOARD_SETTINGS',
    'ADD_COMMENT', 'ADD_ATTACHMENT', 'MANAGE_LABELS',
  ]),
  MEMBER: new Set([
    'CREATE_TASK', 'MOVE_TASK', 'ASSIGN_TASK',
    'ADD_COMMENT', 'ADD_ATTACHMENT', 'MANAGE_LABELS',
  ]),
  VIEWER: new Set([]),
};

export function canPerformBoardAction(role: BoardRole, action: BoardAction): boolean {
  return ACTION_MATRIX[role]?.has(action) ?? false;
}
```

**Every Server Action calls `canPerformBoardAction` before any DB write.** This single function is the entire authorization layer for the application.

---

### `src/lib/permission.ts`

```typescript
export async function getUserRole(boardId: string): Promise<BoardRole | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
    select: { role: true },
  });
  return member?.role ?? null;
}
```

This is called at the start of every board-scoped Server Action. It queries the DB every time — ensuring role changes take effect immediately without cache invalidation.

---

### `src/lib/metrics.ts`

The **analytics engine**. Three key calculations:

#### Lead Time

Time from task creation to first entry into an "In Progress" (or equivalent) column.

```typescript
export function calculateLeadTime(task: Task): number | null {
  if (!task.startedAt) return null;
  return differenceInHours(task.startedAt, task.createdAt);
}
```

#### Cycle Time

Time from `startedAt` to `completedAt`.

```typescript
export function calculateCycleTime(task: Task): number | null {
  if (!task.startedAt || !task.completedAt) return null;
  return differenceInHours(task.completedAt, task.startedAt);
}
```

#### Cumulative Flow Diagram Data

For each day in the range, count tasks in each column at that point in time. Uses task.createdAt, column moves, and completedAt to reconstruct historical state. Returns: `Array<{ date: string; [columnName: string]: number }>`.

Metrics are stored in `BoardMetric` snapshots triggered after every `moveTask` call. This avoids recomputing the CFD from scratch on every dashboard view.

---

### `src/lib/reminders.ts`

The **reminder scheduler**. Designed to be triggered by an external cron (Vercel Cron or Render cron job) via a protected API route.

```typescript
export async function processReminders() {
  const overdueReminders = await prisma.task.findMany({
    where: {
      reminderAt: { lte: new Date() },
      reminderSentAt: null,
      isArchived: false,
    },
    include: {
      assignee: true,
      column: { include: { board: true } },
    },
  });

  for (const task of overdueReminders) {
    if (!task.assignee) continue;
    
    await createNotification(task.assignee.id, 'TASK_REMINDER', {
      title: `Reminder: "${task.title}"`,
      body: `This task is due soon on board "${task.column.board.title}"`,
      linkUrl: `/board/${task.column.board.id}`,
    });

    // Mark as sent to prevent duplicate reminders (idempotency guard)
    await prisma.task.update({
      where: { id: task.id },
      data: { reminderSentAt: new Date() },
    });
  }
}
```

The `reminderSentAt` guard is the key idempotency mechanism. If the cron job runs twice in quick succession (a known failure mode for distributed cron systems), only the first run will send reminders.

---

### `src/lib/archiveMarkers.ts`

Soft-delete helpers that centralize the "is this entity active?" logic.

```typescript
export async function archiveTask(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { isArchived: true, archivedAt: new Date() },
  });
}

export async function restoreTask(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { isArchived: false, archivedAt: null },
  });
}

export function buildActiveFilter() {
  return { isArchived: false };
}
```

Every Prisma query that lists tasks or boards uses `where: { ...buildActiveFilter() }` to automatically exclude archived entities.

---

### `src/lib/dataAccessLayer.ts`

A **Data Access Layer (DAL)** that centralizes all Prisma read operations to enable caching, logging, and future pagination changes in one place.

```typescript
export async function getBoard(boardId: string) {
  return cache(async () => {
    return prisma.board.findUnique({
      where: { id: boardId },
      include: { /* deep include */ },
    });
  })();
}
```

Uses React's `cache()` function to deduplicate identical queries within a single server render pass — if three server components on the same page all call `getBoard(boardId)`, only one DB query is executed.

---

### `src/lib/emailDigest.ts`

Composes and sends digest emails. Uses Nodemailer with SMTP credentials from env variables. The email template is an inline HTML string formatted with a table of notifications.

```typescript
export async function sendDigest(userId: string, notifications: Notification[]) {
  const html = composeDigestHTML(notifications);
  await transporter.sendMail({
    from: '"KanbanSync" <noreply@kanbansync.app>',
    to: user.email,
    subject: `Your KanbanSync digest (${notifications.length} updates)`,
    html,
  });
}
```

---

### `src/lib/onboardingExampleBoard.ts`

Creates a pre-populated demo board for new users. Called once immediately after `signUpAction`. The board is seeded with:
- 3 default columns: **To Do**, **In Progress**, **Done**
- 5 example tasks with descriptions, labels, and subtasks
- 1 completed task (to demonstrate cycle time metrics immediately)

This gives users an immediately understandable UI without requiring them to create their first board from scratch.

---

### `src/lib/activity.ts`

Formats raw activity log entries (e.g., `task.moved`, `member.invited`) into human-readable strings for display in the board's activity feed panel.

---

## 7. Frontend — Every File & Component Explained

### `src/app/layout.tsx` — Root Layout

Wraps every page. Provides `SessionProvider`, theme provider, and global `<Toaster />`.

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### `src/app/page.tsx` — Root Page

A simple redirect. Checks session status: authenticated users go to `/dashboard`, unauthenticated go to `/login`. Implemented as an async server component that calls `auth()`.

### `src/app/dashboard/page.tsx` — Board List Dashboard

An async server component that calls `getMyBoards()` and renders a grid of `BoardCard` components. Each card shows title, member avatars, task count, and last-activity timestamp. The "Create Board" button opens a dialog that calls `createBoard()`.

### `src/app/board/[boardId]/page.tsx` — Kanban Board Page

The most complex page. An async server component that:
1. Calls `getBoardWithDetails(boardId)` — fetches entire board tree
2. Passes the result to `<KanbanBoard board={board} />` as a prop

All subsequent mutations (drag, create, delete) happen client-side via Server Actions. Pusher events handle real-time updates.

### `src/app/board/[boardId]/layout.tsx` — Board Layout

Wraps the board page with:
- `<BoardHeader />` — title, member list, settings menu
- `<BoardSidebar />` — navigation, metrics shortcut, archived tasks

The layout fetches board metadata separately from the page (only title and members, not the full task tree) to keep the header render fast.

---

### `src/components/features/board/KanbanBoard.tsx`

The **drag-and-drop orchestrator** — the largest client component. Uses `@dnd-kit/core` to handle:
- Drag sensors for mouse and touch
- Column reordering (drag a column header)
- Task reordering within a column
- Task movement between columns
- Optimistic UI updates (task appears in new position immediately, before server confirms)

```tsx
async function handleTaskDrop(taskId: string, targetColumnId: string, newPosition: number) {
  // 1. Optimistically update local state
  setColumns(prev => moveTaskOptimistically(prev, taskId, targetColumnId, newPosition));
  
  // 2. Call Server Action
  const result = await moveTask(taskId, targetColumnId, newPosition);
  if (!result.success) {
    // 3. Revert optimistic update on failure
    setColumns(board.columns);
    toast.error(result.error);
  }
}
```

**Why optimistic updates?** Without them, the task would snap back to its original position for ~200ms (server round-trip) before appearing in the new position — a jarring experience for a drag-and-drop UI.

### `src/components/features/board/TaskCard.tsx`

Compact task card displayed in each column. Shows:
- Task title (truncated to 2 lines)
- Label badges (color-coded)
- Due date (red if overdue, orange if due today)
- Assignee avatar
- Subtask progress (e.g., "2/5")
- Comment count badge
- Priority indicator

Clicking the card opens `TaskDetailModal`.

### `src/components/features/board/TaskDetailModal.tsx`

A full-screen overlay with 4 panels:
- **Details** — title (inline editable), description (rich text), due date, reminder, priority, labels
- **Subtasks** — checklist with add/toggle/delete
- **Attachments** — file upload, file list with download links
- **Comments** — threaded comments with markdown support, real-time updates via task-level Pusher channel

All edits call Server Actions directly. The `useOptimistic` React hook ensures the UI stays responsive.

### `src/components/features/board/MemberManager.tsx`

A dialog component accessible from the board header. Allows OWNER and LEADER to:
- See all current members with their roles and avatars
- Change a member's role (dropdown selector)
- Remove a member
- Invite a new member by email

All actions call `memberActions.ts` Server Actions and emit Pusher events to update the header's member avatar stack in real-time.

### `src/hooks/useBoardRealtime.ts`

```typescript
export function useBoardRealtime(boardId: string, onEvent: (event: string, data: any) => void) {
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`board-${boardId}`);
    
    const events = [
      'task-created', 'task-moved', 'task-updated', 'task-deleted',
      'column-created', 'column-renamed', 'column-deleted',
      'member-added', 'member-removed', 'member-role-changed',
      'board-updated'
    ];
    
    events.forEach(event => {
      channel.bind(event, (data: any) => onEvent(event, data));
    });

    return () => {
      events.forEach(event => channel.unbind(event));
      pusher.unsubscribe(`board-${boardId}`);
    };
  }, [boardId]);
}
```

---

## 8. Database Schema & Data Model

### Entity Relationship Overview

```
User -------------------------------------------------------------- (author)
 |                                                                        |
 | (ownerId)       (memberId)          (assigneeId)     (authorId)       |
 v                  v                   v               v                |
Board --- BoardMember         Task --- Comment          |                |
 |          (role: OWNER,      |                        |                |
 |           LEADER,           |--- SubTask             |                |
 |           MEMBER,           |--- Attachment          |                |
 |           VIEWER)           |--- Label               |                |
 |                             |                        |                |
 v                             v                        |                |
Column --- Column --- Column (ordered by position)     Notification <---+
 |
 +-- Task[] (ordered by position within column)
```

### Full Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- Authentication (NextAuth Prisma Adapter) ---

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// --- Domain Models ---

model User {
  id            String         @id @default(cuid())
  name          String?
  email         String?        @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  boards        BoardMember[]
  assignedTasks Task[]         @relation("TaskAssignee")
  comments      Comment[]
  notifications Notification[]
  createdAt     DateTime       @default(now())
}

model Board {
  id          String        @id @default(cuid())
  title       String
  description String?
  coverColor  String        @default("#6366f1")
  ownerId     String
  isArchived  Boolean       @default(false)
  archivedAt  DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  members     BoardMember[]
  columns     Column[]
  metrics     BoardMetric[]
  @@index([ownerId])
}

model BoardMember {
  id      String    @id @default(cuid())
  boardId String
  userId  String
  role    BoardRole @default(MEMBER)
  board   Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([boardId, userId])
  @@index([userId])
}

enum BoardRole {
  OWNER
  LEADER
  MEMBER
  VIEWER
}

model Column {
  id         String   @id @default(cuid())
  title      String
  position   Int
  boardId    String
  isArchived Boolean  @default(false)
  board      Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  tasks      Task[]
  @@index([boardId])
}

model Task {
  id             String       @id @default(cuid())
  title          String
  description    String?
  position       Int
  columnId       String
  assigneeId     String?
  priority       Priority     @default(MEDIUM)
  dueAt          DateTime?
  reminderAt     DateTime?
  reminderSentAt DateTime?    // Idempotency guard for reminder scheduler
  startedAt      DateTime?    // Set when task first enters an "In Progress" column
  completedAt    DateTime?    // Set when task enters a "Done" column
  isArchived     Boolean      @default(false)
  archivedAt     DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  column         Column       @relation(fields: [columnId], references: [id], onDelete: Cascade)
  assignee       User?        @relation("TaskAssignee", fields: [assigneeId], references: [id])
  labels         Label[]
  subtasks       SubTask[]
  attachments    Attachment[]
  comments       Comment[]
  @@index([columnId])
  @@index([assigneeId])
  @@index([dueAt])
  @@index([reminderAt])
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Label {
  id      String @id @default(cuid())
  name    String
  color   String
  tasks   Task[]
  boardId String
  @@unique([boardId, name])
}

model SubTask {
  id          String  @id @default(cuid())
  title       String
  isCompleted Boolean @default(false)
  taskId      String
  task        Task    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  @@index([taskId])
}

model Attachment {
  id         String   @id @default(cuid())
  filename   String
  url        String
  size       Int
  mimeType   String
  taskId     String
  uploadedAt DateTime @default(now())
  task       Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  @@index([taskId])
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  taskId    String
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])
  @@index([taskId])
}

model Notification {
  id           String           @id @default(cuid())
  userId       String
  type         NotificationType
  title        String
  body         String?
  linkUrl      String?
  isRead       Boolean          @default(false)
  isDigestSent Boolean          @default(false)
  createdAt    DateTime         @default(now())
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, isRead])
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_REMINDER
  COMMENT_ADDED
  BOARD_INVITATION
  MEMBER_ROLE_CHANGED
  BOARD_UPDATED
}

model BoardMetric {
  id        String   @id @default(cuid())
  boardId   String
  snapshot  Json     // { columnName: taskCount } for CFD
  createdAt DateTime @default(now())
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  @@index([boardId, createdAt])
}
```

### Index Strategy

| Index | Reason |
|---|---|
| `BoardMember(userId)` | Fast lookup of "all boards I belong to" |
| `BoardMember(boardId, userId)` UNIQUE | Prevent duplicate memberships; enables `.findUnique` |
| `Task(columnId)` | Core query: "all tasks in this column" |
| `Task(assigneeId)` | "All tasks assigned to me" query |
| `Task(dueAt)` | Reminder scheduler: tasks due within range |
| `Task(reminderAt)` | Cron query: `WHERE reminderAt <= now() AND reminderSentAt IS NULL` |
| `Notification(userId, isRead)` | Badge count: `COUNT WHERE userId = ? AND isRead = false` |
| `BoardMetric(boardId, createdAt)` | Time-range queries for CFD chart |
| `Comment(taskId)` | All comments for a task |

---

## 9. Authentication & Authorization System

### NextAuth v5 Configuration

`auth.config.ts` defines providers and callbacks:

```typescript
import { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

export const authConfig: NextAuthConfig = {
  providers: [
    Google,
    GitHub,
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        return valid ? user : null;
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/dashboard',
  },
};
```

### Authentication Flow

```
1. User visits /login
2. Chooses OAuth (Google/GitHub) or email/password
3. NextAuth validates credentials
4. JWT created: { sub: userId, email, name, image }
5. Session cookie set (httpOnly, secure, sameSite=lax)
6. Redirect to /dashboard
7. middleware.ts validates JWT on every subsequent request to /dashboard/* and /board/*
```

### Authorization Flow (Every Board Action)

```
Server Action called
        |
        v
getUserRole(boardId)
  -> prisma.boardMember.findUnique({ boardId, userId: session.user.id })
  -> Returns: OWNER | LEADER | MEMBER | VIEWER | null
        |
        v
canPerformBoardAction(role, action)
  -> ACTION_MATRIX[role].has(action)
  -> Returns: true | false
        |
     +--+--+
  true   false
     |      |
     v      v
Proceed  throw AuthorizationError('You do not have permission to perform this action')
```

**Key security guarantee:** Even if a client somehow calls a Server Action with a forged `boardId`, `getUserRole()` queries the live DB for the caller's actual role on that board — not a client-supplied role claim.

---

## 10. Real-Time Collaboration with Pusher

### Channel Topology

| Channel | Events | Subscribers |
|---|---|---|
| `board-{boardId}` | task-created, task-moved, task-updated, task-deleted, column-*, member-* | All members currently viewing that board |
| `task-{taskId}` | comment-added, comment-updated, subtask-toggled, attachment-added | Users with the task detail modal open |
| `user-{userId}` | notification, invitation-received, board-created | The specific user, for personal alerts |

### Real-Time Task Move Sequence

```
User A drags task                     User B (same board)
       |                                      |
       v                                      |
Optimistic state update                       |
       |                                      |
       v                                      |
moveTask() Server Action                      |
       |                                      |
       v                                      |
DB: atomic position reorder                   |
       |                                      |
       v                                      |
pusherServer.trigger(                         |
  'board-{id}',                               |
  'task-moved',                               |
  { taskId, targetColumnId, newPosition }     |
)                                             |
       |                                      |
       |    Pusher delivers event ----------->|
       |                              Client event handler fires
       |                              setColumns(moveTaskOptimistically(...))
       |                                      |
       v                                      v
Server confirms success              User B sees update instantly
```

### Why Pusher (not native WebSocket, Socket.IO, or SSE)?

| Approach | Chosen? | Reason |
|---|---|---|
| **Pusher** | Yes | Fully managed, scales to thousands of connections, no infrastructure maintenance |
| Native WebSocket | No | Requires stateful server — incompatible with Vercel's stateless serverless functions |
| Server-Sent Events | No | One-directional, cannot be used for bidirectional events like task moves |
| Socket.IO | No | Same infrastructure problem as native WebSocket on Vercel |

**The fundamental constraint:** Vercel functions are stateless and may run on different machines for different requests. A WebSocket server requires a persistent connection to a single machine. Pusher is the standard solution for this in the Next.js ecosystem.

---

## 11. Permissions Matrix & Role System

### Role Definitions

| Role | Who has it | Scope |
|---|---|---|
| `OWNER` | Board creator; one per board | Full control of the board including deletion |
| `LEADER` | Appointed by OWNER | Management without destructive board-level actions |
| `MEMBER` | Default for invited users | Task management only |
| `VIEWER` | Read-only invitees | Zero mutations |

### Full Permission Matrix

| Action | OWNER | LEADER | MEMBER | VIEWER |
|---|---|---|---|---|
| Create Task | ✅ | ✅ | ✅ | ❌ |
| Move Task | ✅ | ✅ | ✅ | ❌ |
| Delete Task | ✅ | ✅ | ❌ | ❌ |
| Assign Task | ✅ | ✅ | ✅ | ❌ |
| Create Column | ✅ | ✅ | ❌ | ❌ |
| Delete Column | ✅ | ✅ | ❌ | ❌ |
| Rename Column | ✅ | ✅ | ❌ | ❌ |
| Add Comment | ✅ | ✅ | ✅ | ❌ |
| Add Attachment | ✅ | ✅ | ✅ | ❌ |
| Manage Labels | ✅ | ✅ | ✅ | ❌ |
| Invite Member | ✅ | ✅ | ❌ | ❌ |
| Remove Member | ✅ | ✅ (MEMBERs only) | ❌ | ❌ |
| Change Member Role | ✅ | ❌ | ❌ | ❌ |
| Update Board Settings | ✅ | ✅ | ❌ | ❌ |
| Archive Board | ✅ | ❌ | ❌ | ❌ |
| Delete Board | ✅ | ❌ | ❌ | ❌ |

---

## 12. Metrics & Analytics Engine

### Why Custom Metrics?

No off-the-shelf analytics tool understands the KanbanSync domain model well enough to compute Kanban-specific metrics without significant configuration. Building custom metrics directly on top of Prisma queries ensures:
- Exact calculation semantics (what counts as "started"? what is the "done" column?)
- No data leaves the PostgreSQL database to a third-party service
- Metrics are tied to board-specific column naming conventions

### Lead Time Calculation

```
Lead Time = startedAt - createdAt

Example:
  Task created: Monday 09:00
  Task moved to "In Progress": Tuesday 14:00
  Lead Time = 29 hours
```

Used to measure **flow efficiency** — how long tasks sit in the backlog before work begins.

### Cycle Time Calculation

```
Cycle Time = completedAt - startedAt

Example:
  Task moved to "In Progress": Tuesday 14:00
  Task moved to "Done": Thursday 11:00
  Cycle Time = 45 hours
```

Used to measure **team throughput** — how fast work gets done once started.

### Cumulative Flow Diagram

The CFD shows the number of tasks in each column over time. A healthy CFD shows bands of consistent width. Widening bands indicate bottlenecks.

```
BoardMetric snapshot (taken after every moveTask):
{
  "To Do": 8,
  "In Progress": 3,
  "Review": 2,
  "Done": 15,
  "timestamp": "2026-08-05T10:00:00Z"
}
```

Plotting 30 days of snapshots produces the CFD chart on the dashboard.

---

## 13. Notification & Reminder System

### Notification Types & Triggers

| Type | Trigger | Channel |
|---|---|---|
| `TASK_ASSIGNED` | `assignTask()` called | `user-{assigneeId}` Pusher + DB persist |
| `COMMENT_ADDED` | `addComment()` called on task with assignee | `user-{assigneeId}` Pusher + DB persist |
| `BOARD_INVITATION` | `inviteMember()` called | `user-{invitedUserId}` Pusher + DB persist |
| `TASK_REMINDER` | Cron: `reminderAt <= now()` | `user-{assigneeId}` Pusher + DB persist |
| `MEMBER_ROLE_CHANGED` | `changeMemberRole()` called | `user-{memberId}` Pusher + DB persist |

### Notification Lifecycle

```
Action triggers notification
        |
        v
createNotification(userId, type, data)
  -> prisma.notification.create({ isRead: false, isDigestSent: false })
  -> pusherServer.trigger('user-{userId}', 'notification', { title })
        |
        v
Client receives Pusher event
  -> Notification bell badge increments (+1)
  -> Toast popup appears
        |
        v
User opens Notification Center
  -> fetchNotifications() from DB
  -> markAllRead() -> SET isRead = true
        |
        v
Nightly digest cron (processDigests)
  -> Find all notifications WHERE isRead = false AND isDigestSent = false
  -> sendDigest(userId, notifications)
  -> SET isDigestSent = true
```

---

## 14. Onboarding System

New users see a blank dashboard and immediately feel lost — this is a known UX anti-pattern for Kanban tools (Trello, Linear, Asana all solve it with example content).

### KanbanSync's Solution: Pre-populated Example Board

When `signUpAction` completes:
1. `createOnboardingBoard(userId)` is called from `onboardingExampleBoard.ts`
2. It creates a board titled **"My First Project"** owned by the new user
3. Seeds columns: To Do, In Progress, Review, Done
4. Seeds tasks with real-world-style titles, descriptions, labels, and subtasks
5. Seeds one task in "Done" with `completedAt` set — so the metrics dashboard shows sample data immediately

This gives users an immediately understandable UI without requiring them to create their first board from scratch.

---

## 15. All Server Actions: Input → Output Flow

### Board Actions Summary

```
createBoard(title, description, color)
  Input: { title: string, description?: string, color?: string }
  Auth: Any authenticated user
  Output: { boardId: string }
  Side effects: BoardMember(OWNER) created, default columns created

getBoardWithDetails(boardId)
  Input: boardId: string
  Auth: BoardMember of that board (any role)
  Output: Full Board object with columns -> tasks -> assignee, labels, subtasks, attachments

updateBoardSettings(boardId, settings)
  Input: { title?, description?, coverColor? }
  Auth: OWNER or LEADER
  Output: Updated Board
  Side effects: Pusher 'board-updated' event

archiveBoard(boardId)
  Input: boardId: string
  Auth: OWNER only
  Output: { success: true }
  Side effects: Board.isArchived = true

deleteBoard(boardId)
  Input: boardId: string
  Auth: OWNER only
  Output: { success: true }
  Side effects: Cascade delete of all child records

inviteMember(boardId, email, role)
  Input: { boardId, email: string, role: BoardRole }
  Auth: OWNER or LEADER
  Output: { memberId: string }
  Side effects: Notification created, Pusher 'invitation-received' event
```

### Task Actions Summary

```
createTask(boardId, columnId, title, position)
  Input: { columnId: string, title: string, position: number }
  Auth: OWNER, LEADER, MEMBER
  Output: Created Task object
  Side effects: Pusher 'task-created' event

moveTask(taskId, targetColumnId, newPosition)
  Input: { taskId, targetColumnId: string, newPosition: number }
  Auth: OWNER, LEADER, MEMBER
  Output: Updated Task
  Side effects:
    - Atomic DB transaction: reorder source + target columns
    - Set startedAt / completedAt based on target column type
    - RecordMetricSnapshot
    - Pusher 'task-moved' event

assignTask(taskId, assigneeId)
  Input: { taskId, assigneeId: string | null }
  Auth: OWNER, LEADER, MEMBER
  Output: Updated Task
  Side effects: TASK_ASSIGNED notification + Pusher event

updateTaskDueDate(taskId, dueDate, reminderAt)
  Input: { taskId, dueDate: Date | null, reminderAt: Date | null }
  Auth: OWNER, LEADER, MEMBER
  Output: Updated Task
  Side effects: reminderSentAt reset to null

deleteTask(taskId)
  Input: taskId: string
  Auth: OWNER, LEADER
  Output: { success: true }
  Side effects: Soft archive; Pusher 'task-deleted' event

addLabel(taskId, name, color) / removeLabel(taskId, labelId)
  Input: { taskId, name: string, color: string }
  Auth: OWNER, LEADER, MEMBER
  Output: Updated Label list
  Side effects: Pusher 'task-updated' event
```

### Detail Actions Summary

```
addComment(taskId, content)
  Input: { taskId, content: string }
  Auth: Any board member
  Output: Created Comment
  Side effects: COMMENT_ADDED notification to assignee; Pusher 'comment-added' on task-{id} channel

updateTaskDescription(taskId, description)
  Input: { taskId, description: string }
  Auth: OWNER, LEADER, MEMBER
  Output: Updated Task
  Side effects: Pusher 'task-updated' event

addSubtask(taskId, title)
  Input: { taskId, title: string }
  Auth: OWNER, LEADER, MEMBER
  Output: Created SubTask
  Side effects: Pusher 'task-updated' (subtask count)

toggleSubtask(subtaskId)
  Input: subtaskId: string
  Auth: OWNER, LEADER, MEMBER
  Output: Updated SubTask

uploadAttachment(taskId, formData)
  Input: FormData with file
  Auth: OWNER, LEADER, MEMBER
  Output: Created Attachment { url, filename, size }
  Side effects: File stored in Cloudinary; Pusher 'attachment-added'
```

### Notification Actions Summary

```
getNotifications()
  Input: (none - uses session)
  Auth: Authenticated
  Output: Notification[] (unread first, ordered by createdAt DESC)

markNotificationRead(notificationId)
  Input: notificationId: string
  Auth: Notification owner only
  Output: { success: true }

markAllRead()
  Input: (none)
  Auth: Authenticated
  Output: { count: number }

sendNotificationDigestNow(userId)
  Input: userId: string (admin/cron only)
  Output: { sent: number }
```

---

## 16. Deployment & CI/CD Pipeline

### Deployment Architecture

```
Developer pushes to GitHub (main branch)
        |
        v
Vercel detects push (webhook)
        |
        v
Vercel Build Step:
  -> npm install
  -> npx prisma generate (generates typed client)
  -> npm run build (Next.js production build)
  -> Static assets uploaded to CDN
        |
        v
Vercel Deploy:
  -> Serverless functions deployed to Node.js runtime
  -> Edge middleware deployed to Edge runtime
        |
        v
Post-Deploy Hook:
  -> npx prisma migrate deploy (applies pending migrations to Render PostgreSQL)
```

### Environment Separation

| Environment | Database | Pusher App | URL |
|---|---|---|---|
| **Development** | Local PostgreSQL | Pusher dev app | `http://localhost:3000` |
| **Preview** | Shared staging DB | Pusher dev app | `https://kanbansync-{hash}.vercel.app` |
| **Production** | Render PostgreSQL | Pusher prod app | `https://kanbansync.app` |

### CI/CD Stages

| Stage | Tool | Description |
|---|---|---|
| **Code** | GitHub (main branch) | Pull-request workflow triggers Vercel preview builds |
| **Build** | Vercel Build (Next.js) | Executes `npm run build` with type checking |
| **DB Migration** | Render Deploy Hook | Runs `npx prisma migrate deploy` after each successful Vercel build |
| **Tests** | GitHub Actions | `npm test` (Jest) and `npm run e2e` (Playwright) |
| **Release** | Vercel Production Deploy | Manual promotion from preview to production |

---

## 17. Security Model

### Authentication Security

- **JWT signed with `AUTH_SECRET`** (256-bit random string) — tokens cannot be forged without the secret
- **Short JWT lifetime** — 15 minutes; refreshed on each request via the session callback
- **httpOnly cookies** — Session cookies are inaccessible to JavaScript, preventing XSS token theft
- **CSRF protection** — NextAuth v5 uses `SameSite=Lax` cookies and validates the `Origin` header on all POST requests

### Authorization Security

- **No client-supplied roles** — The role used for authorization (`getUserRole()`) is always fetched from the DB — never from a cookie or request body
- **Every action re-validates** — There is no "cached role" in a session that could be stale. Every Server Action queries `BoardMember` fresh
- **Ownership checks before updates** — Actions like `deleteBoard`, `archiveBoard` verify `ownerId === session.user.id` before the DB write

### Data Security

- **Prisma parameterized queries** — All DB queries use Prisma's query builder, which uses prepared statements. SQL injection is structurally impossible
- **Input validation with Zod** — Server Actions validate inputs against Zod schemas before touching Prisma. Unexpected fields are stripped
- **File upload validation** — Attachments validate MIME type and size (max 10MB) before upload to Cloudinary
- **Environment secrets** — Database URL, Pusher secret, and auth secret are in environment variables only — never in source code or client bundles

### Rate Limiting

A Next.js middleware layer applies IP-based rate limiting to Server Action endpoints:
- Board creation: 10 boards per hour per user
- Comment posting: 60 comments per minute per user
- File uploads: 20 files per hour per user

---

## 18. Performance & Scaling Strategy

### Query Optimization

| Problem | Solution |
|---|---|
| **N+1 on board load** | Single Prisma query with deep `include` fetches all columns, tasks, and assignees in one round-trip |
| **Repeated board queries per render** | React `cache()` in `dataAccessLayer.ts` deduplicates identical queries within one render pass |
| **Notification badge count** | Indexed `(userId, isRead)` — count query is an index scan, not a full table scan |
| **CFD queries** | `BoardMetric` snapshots avoid recomputing CFD from task history on every dashboard view |
| **Position reordering** | Bulk `updateMany` with conditional position arithmetic — one query per column, not one per task |

### Caching Strategy

```
Request lifecycle caching:
  React cache() -- deduplicates within single render
  React Server Components -- fetch data on server, client receives HTML

Client-side caching:
  React Query (planned) -- for mutations that need optimistic updates

Static assets:
  Vercel CDN -- serves static files with long-lived cache headers
```

### Real-Time Scaling

Pusher handles up to 100 concurrent connections on the free tier, 500 on the paid tier. For boards with more than 100 simultaneous active users, Pusher channels can be split per column to reduce event fan-out.

---

## 19. Challenges Faced & Solutions Implemented

| # | Challenge | Root Cause | Solution Applied |
|---|---|---|---|
| 1 | **Vercel build crash: "Module not found: Can't resolve 'net'"** | `pusher-server.ts` was imported by a client component, pulling Node.js built-ins into the browser bundle | Split into `pusher-server.ts` (server-only) and `pusher.ts` (browser-safe lazy factory) |
| 2 | **Stale session after DB reset** | JWT stored `userId` that no longer existed after `prisma migrate reset --force` in dev | Added null-check in `getUserRole()`: if user not found, return `null` → Server Action throws 401 |
| 3 | **Sign-out form not working** | HTML form POSTed to `/api/auth/signout` — a path NextAuth v5 no longer recognizes (v4 path) | Replaced with `signOut()` Server Action called from a client `<form action={signOutAction}>` |
| 4 | **Notification duplication from reminder cron** | Cron job ran twice simultaneously due to Vercel function retries | Added `reminderSentAt` timestamp guard + idempotent `updateMany({ where: { reminderAt: { lte: now }, reminderSentAt: null } })` |
| 5 | **Missing DB indexes causing slow dashboard** | Initial schema had no indexes on foreign keys — acceptable in dev, unacceptable at scale | Added `@index` annotations on `userId`, `boardId`, `columnId`, `assigneeId` foreign keys |
| 6 | **Task position conflicts after concurrent moves** | Two users dragging tasks simultaneously could produce identical `position` values | Wrapped position reorders in `prisma.$transaction([])` — concurrent transactions serialize at the DB level |
| 7 | **Pusher event flooding on rapid typing** | Each keystroke in the task title editor triggered a `task-updated` Pusher event | Debounced the update call by 500ms on the client; only one event fires per burst of typing |
| 8 | **OAuth callback URL mismatch on Vercel preview** | Preview deployments have random URLs (`kanbansync-abc.vercel.app`) not registered in Google OAuth console | Added wildcard redirect URI at Google (`*.vercel.app`) for non-production; production uses fixed URI |
| 9 | **Email digest sending duplicates** | Digest cron and user-triggered "send now" ran simultaneously | Added `isDigestSent` flag to `Notification` model; both paths check this flag before sending |
| 10 | **`getPusherClient()` called on server** | A component that ran on both server and client called `getPusherClient()` — which uses `window` | Added `'use client'` directive to all components using Pusher; split data-fetching (server) from real-time subscription (client) |

---

## 20. What Could Be Better — Future Roadmap

### High Priority (Build Next)

1. **Native WebSocket fallback** — Pusher's free tier has connection limits. When the app grows, switching to a self-hosted WebSocket server (Socket.IO on a separate Node.js service) eliminates vendor dependency and cost.

2. **Optimistic updates everywhere** — Currently only `moveTask` has optimistic UI. `addComment`, `assignTask`, `addLabel` should all optimistically update before server confirms — eliminating perceived latency.

3. **Keyboard accessibility for drag-and-drop** — The current drag implementation relies on mouse events. Adding keyboard-accessible task movement (arrow keys + Enter to confirm) is required for WCAG 2.1 AA compliance.

4. **Undo/redo system** — Accidental task deletions or column moves have no recovery path. An undo queue (client-side, ephemeral) storing the last 10 operations would significantly improve UX.

5. **Full-text search** — `SELECT * FROM tasks WHERE title ILIKE '%search%'` is a sequential scan. Implementing PostgreSQL full-text search (`tsvector` + `GIN` index) or integrating Algolia would make search fast at scale.

### Medium Priority (Next Quarter)

6. **GraphQL API layer** — External integrations (Zapier, Slack bot, GitHub Actions) need a stable, versioned API. A thin GraphQL wrapper over the existing Service functions would enable this without rewriting business logic.

7. **Custom role creation** — Currently roles are fixed (`OWNER`, `LEADER`, `MEMBER`, `VIEWER`). Supporting board-specific custom roles (e.g., "Reviewer", "Tester") requires a `CustomRole` model and dynamic ACTION_MATRIX lookup.

8. **Time tracking** — Add `timeEntries` to tasks: start/stop timer, log time manually. Feeds into the metrics dashboard alongside lead/cycle time.

9. **Board templates** — Allow boards to be saved as templates (without task content). Creating a new board from a template pre-creates the column structure.

10. **Two-factor authentication** — NextAuth v5 supports TOTP 2FA but it requires additional session handling. High-value organizations managing sensitive projects would benefit from 2FA enforcement.

### Long-Term Vision

11. **Export to CSV/JIRA** — One-click board export for organizations migrating data.

12. **Automated index health checks** — A GitHub Actions workflow that runs `EXPLAIN ANALYZE` on the top-10 most frequent queries and fails CI if any sequential scans are detected.

13. **Feature flag system** — Gradual rollout of experimental features using an open-source flag system (e.g., Flagsmith) without full deployments.

14. **Mobile app** — A React Native companion app using the same Server Actions via fetch. The Next.js server already returns JSON — native clients would call the same Server Action endpoints.

15. **AI task suggestions** — Integrate an LLM (Gemini Flash, GPT-4o-mini) to suggest task breakdowns when creating a new board. "I'm building a SaaS app" → auto-generates a backlog of common development tasks.

---

## 21. Environment Variables Reference

| Variable | Scope | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | Server | Yes | PostgreSQL connection string. Format: `postgresql://user:pass@host:5432/dbname` |
| `AUTH_SECRET` | Server | Yes | 256-bit random string for JWT signing. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Server | Yes (prod) | Canonical frontend URL. Used for OAuth callback URLs. |
| `GOOGLE_CLIENT_ID` | Server | Optional | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Server | Optional | Google OAuth app client secret |
| `GITHUB_CLIENT_ID` | Server | Optional | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Server | Optional | GitHub OAuth app client secret |
| `NEXT_PUBLIC_PUSHER_KEY` | Client | Yes | Pusher app public key (safe to expose — used only for subscribing) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Client | Yes | Pusher cluster (e.g., `eu`, `us2`, `ap2`) |
| `PUSHER_APP_ID` | Server | Yes | Pusher app identifier (used for triggering events) |
| `PUSHER_SECRET` | Server | Yes | Pusher signing secret (never exposed to client) |
| `CLOUDINARY_CLOUD_NAME` | Server | Optional | Cloudinary cloud name for file uploads |
| `CLOUDINARY_API_KEY` | Server | Optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Server | Optional | Cloudinary API secret |
| `EMAIL_HOST` | Server | Optional | SMTP host for Nodemailer (e.g., `smtp.gmail.com`) |
| `EMAIL_PORT` | Server | Optional | SMTP port (usually `587` for TLS) |
| `EMAIL_USER` | Server | Optional | SMTP username |
| `EMAIL_PASS` | Server | Optional | SMTP password or app password |
| `CRON_SECRET` | Server | Optional | Secret token for protected cron API routes |
| `NODE_ENV` | Server | Auto | `development` or `production` — controls Prisma logging verbosity |

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/yourname/kanbansync.git
cd kanbansync/kanbansync

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Fill in required variables in .env.local

# 5. Apply database migrations
npx prisma migrate dev

# 6. Generate Prisma client
npx prisma generate

# 7. (Optional) Seed demo data
npx ts-node src/scripts/seed.ts

# 8. Start development server
npm run dev

# App running at http://localhost:3000
```

---

## 22. Glossary

| Term | Definition |
|---|---|
| **Server Action** | A Next.js 14+ feature allowing async functions marked with `'use server'` to run exclusively on the server but be called directly from client components as if they were local functions. |
| **App Router** | Next.js 13+ file-system-based routing where `page.tsx` and `layout.tsx` files define routes and shared UI — replacing the older `pages/` directory. |
| **BoardMember** | The join table connecting `User` to `Board` with a `role` enum. One record per user per board. The primary authorization object. |
| **ACTION_MATRIX** | The object in `permissionsMatrix.ts` mapping each `BoardRole` to a `Set<BoardAction>`. The single source of truth for all authorization decisions. |
| **Pusher Channel** | A named pub/sub topic. `board-{id}` carries board-wide events; `task-{id}` carries task-level events; `user-{id}` carries personal notifications. |
| **Soft Delete / Archive** | Setting `isArchived: true` instead of running `DELETE`. Preserves data for audit, metrics, and potential restore. |
| **Lead Time** | Time between task creation and first entry into an active work state ("In Progress"). Measures backlog responsiveness. |
| **Cycle Time** | Time between task first entering active work ("In Progress") and completion ("Done"). Measures team throughput. |
| **CFD** | Cumulative Flow Diagram. A chart plotting the count of tasks in each column over time. Used to spot bottlenecks. |
| **Reminder Sentinel** | The `reminderSentAt` timestamp on `Task`. Acts as an idempotency guard — once set, the reminder scheduler will not re-send for that task. |
| **DAL** | Data Access Layer (`src/lib/dataAccessLayer.ts`). Centralizes all Prisma read queries to enable caching, logging, and future pagination changes in one place. |
| **Onboarding Board** | A pre-populated example board created automatically for every new user, ensuring the UI is immediately understandable without a blank-slate experience. |
| **Demo Account** | A special user account (ID stored in `demoAccount.ts`) that can be logged into with a single click, without creating a real account. Used for public demos. |
| **Optimistic Update** | Immediately updating the client-side UI state to reflect a user action before the server confirms it. Rolled back if the server returns an error. |
| **Position Reordering** | When a task is moved, all other tasks in the source and target columns must have their `position` integers updated to maintain a contiguous, sortable order. Wrapped in a DB transaction. |

---

*Prepared by Antigravity AI — August 2026*
*Document covers KanbanSync at commit HEAD as of 2026-08-05*
