# Contributing to KanbanSync

Thank you for your interest in contributing to **KanbanSync** — a real-time collaborative Kanban board application built with Next.js, Prisma, PostgreSQL, and Pusher. This guide covers everything you need to go from zero to your first merged PR.

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Ways to Contribute](#-ways-to-contribute)
- [Reporting Bugs & Requesting Features (Issues)](#-reporting-bugs--requesting-features-issues)
- [Understanding the Codebase](#-understanding-the-codebase)
- [Local Development Setup](#-local-development-setup)
- [Branching Strategy](#-branching-strategy)
- [Commit Message Conventions](#-commit-message-conventions)
- [Coding Standards](#-coding-standards)
- [Pull Request Process](#-pull-request-process)
- [Project Maintainers](#-project-maintainers)

---

## 🤝 Code of Conduct

By participating in this project you agree to be respectful, constructive, and inclusive in all interactions — in issues, pull requests, code reviews, and discussions. Harassment of any kind is not tolerated.

---

## 💡 Ways to Contribute

You don't have to write code to contribute. Here are all the ways you can help:

| Contribution type | Description |
|---|---|
| 🐛 **Bug Report** | Found something broken? Open an issue using the Bug Report template |
| ✨ **Feature Request** | Have an idea? Open an issue using the Feature Request template |
| 📝 **Documentation** | Improve README, CONTRIBUTING, ARCHITECTURE, or inline JSDoc comments |
| 🔧 **Bug Fix** | Pick an open `bug` issue and submit a fix |
| 🚀 **New Feature** | Pick an open `enhancement` issue and implement it |
| 🎨 **UI/UX** | Improve the Next.js frontend components or styling |
| 🧪 **Tests** | Add missing unit or integration tests |

---

## 🐛 Reporting Bugs & Requesting Features (Issues)

Issues are the primary communication channel for work in this repository. Both **external contributors** and **project admins** use issues to track everything that needs to happen.

**To create an issue:**
1. Go to the [Issues tab](https://github.com/blue9kamrul/KanbanSync/issues)
2. Click **New Issue**
3. Select the appropriate template:
   - 🐛 **Bug Report** — for broken functionality
   - ✨ **Feature Request** — for new ideas or enhancements

### Issue Labels

| Label | Meaning |
|---|---|
| `bug` | Something is not working correctly |
| `enhancement` | New feature or improvement |
| `documentation` | Improvements to docs only |
| `good first issue` | A good starting point for new contributors |
| `help wanted` | Extra attention or expertise needed |
| `in progress` | Actively being worked on |
| `needs triage` | Awaiting maintainer review/assignment |
| `wontfix` | Will not be addressed |
| `blocked` | Blocked by another issue or external factor |

### Issue Assignment

- **Contributors** should comment on an unassigned issue to express interest. A maintainer will assign it to you to avoid duplicate work.
- If an assigned issue has had no activity for **14 days**, it will be unassigned and reopened for others.

---

## 🗺️ Understanding the Codebase

Before contributing, familiarise yourself with these core patterns. A full reference is available in [ARCHITECTURE.md](./ARCHITECTURE.md).

### Architecture Summary

KanbanSync is a **server-first** Next.js application. There is no separate REST API backend — the Next.js server handles everything:

- **Server Actions** (`src/actions/*.ts`) — All business logic and database writes. These are type-safe async server functions called directly from components.
- **Data Access Layer** (`src/lib/dataAccessLayer.ts`) — Memoized database read queries. Use `getBoardData()` instead of writing raw Prisma queries in Server Components.
- **Real-time** — `pusherServer` (server-only) broadcasts events; `getPusherClient` (browser-only) subscribes to channels.
- **RBAC** — Every protected action calls `getUserRole(boardId)` and checks against the centralized `ACTION_MATRIX` in `permissionsMatrix.ts`.

### Key Files to Know

| File | Purpose |
|---|---|
| `src/lib/permissionsMatrix.ts` | The single source of truth for role-action authorization |
| `src/lib/permission.ts` | `getUserRole()` — resolves the current user's role on a board |
| `src/lib/dataAccessLayer.ts` | `getBoardData()` — the primary board read query |
| `src/actions/boardActions.ts` | Board CRUD, column management, archival |
| `src/actions/taskActions.ts` | Task creation, movement, archival, restoration |
| `src/components/features/board/KanbanBoard.tsx` | Top-level board UI orchestrator |

---

## 💻 Local Development Setup

### Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| Node.js | v18+ | LTS recommended |
| npm | v9+ | Comes with Node |
| PostgreSQL | v14+ | Or use a cloud provider (Render, Neon, Supabase) |
| Git | Any recent | — |

### Step 1 — Fork and Clone

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/<your-username>/KanbanSync.git
cd KanbanSync/kanbansync

# Add upstream remote to stay in sync
git remote add upstream https://github.com/blue9kamrul/KanbanSync.git
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Environment Variables

Create a `.env` file in the `kanbansync/` directory:

```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/kanbansync"

# NextAuth — generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-at-least-32-characters"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional, for Google sign-in)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Pusher Channels (required for real-time functionality)
# Get these from https://pusher.com -> Your App -> App Keys
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="..."
PUSHER_APP_ID="..."
PUSHER_SECRET="..."
```

> ⚠️ Never commit your `.env` file. It is listed in `.gitignore`.

### Step 4 — Database Setup

```bash
# Generate the Prisma client from schema.prisma
npx prisma generate

# Apply all pending migrations to your local database
npx prisma migrate dev

# Optional: seed the database or open Prisma Studio
npx prisma studio
```

### Step 5 — Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can register a new account or click **Demo Login** to get an instant pre-populated board to explore.

### Useful Dev Commands

```bash
npm run dev          # Start development server (with hot reload)
npm run build        # Build for production (use to catch type errors)
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev --name <name>  # Create a new migration after schema changes
```

---

## 🌿 Branching Strategy

We use a **feature-branch workflow**. **Never commit directly to `main`.**

### Branch Naming Conventions

All branches must follow this format: `<type>/<short-description>`

| Type | When to use | Example |
|---|---|---|
| `feat/` | New feature | `feat/drag-and-drop-columns` |
| `fix/` | Bug fix | `fix/task-modal-crash-on-mobile` |
| `refactor/` | Code improvement, no behaviour change | `refactor/notifications-actions` |
| `docs/` | Documentation changes only | `docs/update-architecture-guide` |
| `test/` | Adding or updating tests | `test/board-actions-unit-tests` |
| `chore/` | Build, CI, dependency updates | `chore/bump-nextjs-to-16` |

### Workflow

```bash
# 1. Sync your local main with upstream
git checkout main
git fetch upstream
git merge upstream/main

# 2. Create your feature branch
git checkout -b feat/my-new-feature

# 3. Make your changes, commit often
git add .
git commit -m "feat(board): add column color picker to settings"

# 4. Push to your fork
git push origin feat/my-new-feature

# 5. Open a Pull Request on GitHub targeting the upstream `main` branch
```

---

## 📝 Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) strictly. Commits that don't conform will be flagged in code review.

### Format

```
<type>(<scope>): <short description>

[optional body — wrap at 72 chars]

[optional footer: Closes #<issue-number>]
```

### Types

| Type | Usage |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that is neither a fix nor a feature |
| `chore` | Build system, CI/CD, or dependency updates |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `style` | Formatting, whitespace (no logic changes) |
| `perf` | Performance improvement |

### Scopes

Use the area of the codebase you're changing:

`board` · `task` · `auth` · `notification` · `metrics` · `ui` · `db` · `ci` · `deps` · `docs`

### Examples

```bash
feat(board): add cycle planner modal with sprint dates
fix(task): prevent duplicate archive entries on rapid click
refactor(actions): extract common pusher trigger to shared utility
docs(architecture): expand permissions matrix section
chore(deps): bump prisma from 7.0 to 7.2
```

### Linking Issues

Always link related issues in your commit message or PR body:

```
fix(notification): resolve null pointer crash in digest emailer

Closes #47
```

---

## 🛠 Coding Standards

### TypeScript

- **Strict mode is enabled** — no `any`, no `@ts-ignore` without justification.
- All exported functions and non-trivial utilities must have **JSDoc comments** explaining their purpose, params, and return type.
- Use `type` for type aliases and `interface` for object shapes that may be extended.

### Server Actions

- All database writes must go through Server Actions in `src/actions/*.ts` — not inside Server Components or API routes.
- Every action that mutates data must call `getUserRole()` and either `canPerformBoardAction()` or an explicit role check before proceeding.
- Always call `revalidatePath()` after successful writes so the Next.js cache is invalidated.
- Always trigger a Pusher event after successful writes so connected clients get real-time updates.
- Return structured objects `{ success: boolean, error?: string }` — never throw from Server Actions (unhandled throws leak stack traces to the client).

### Real-time (Pusher)

- **Never import `pusher-server.ts` in a Client Component.** This bundles the Node.js `pusher` package into the browser build and breaks the Vercel build.
- For browser subscriptions, always use `getPusherClient()` from `pusher.ts`.
- For server-side broadcasting, always use the `pusherServer` singleton from `pusher-server.ts`.

### Database (Prisma)

- Always go through the centralized `prisma` singleton in `src/lib/db.ts`.
- For data reads in Server Components, use `getBoardData()` from `dataAccessLayer.ts` — it is memoized with `React.cache`.
- Scope all queries to the authenticated user's data — never fetch data without a `where` clause that includes the user's ID or membership.

### React Components

- Client Components that subscribe to Pusher channels must clean up their subscription in the `useEffect` cleanup function to prevent memory leaks.
- Use `React.memo` on expensive, frequently re-rendered components like `BoardColumn` and `SortableTask`.
- Keep components focused — one primary responsibility per component.
- All interactive elements must have accessible `aria-label` attributes.

### ESLint & Formatting

```bash
# Ensure your code passes linting before pushing
npm run lint
```

---

## 🚀 Pull Request Process

### Before Opening a PR

- [ ] Your branch is up-to-date with `upstream/main`
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npm run lint` passes with no errors or warnings
- [ ] Commit messages follow Conventional Commits format
- [ ] JSDoc comments are added for any new utilities, actions, or non-trivial components
- [ ] You have self-reviewed your diff on GitHub before requesting a review

### Opening the PR

1. Push your branch to your fork
2. Go to the upstream repository and click **"Compare & pull request"**
3. Select `main` as the base branch
4. Fill out the PR description — explain **what changed** and **how you tested it**
5. Link the issue your PR resolves: `Closes #<issue-number>`

### Review and Merge

- At least **1 approving review** is required from a maintainer before merging.
- Address all review comments with new commits — do not force-push during the review period.
- Once approved, a maintainer will **squash-merge** your PR into `main`.
- Your branch will be automatically deleted after merge.

### PR Size Guidelines

Keep PRs small and focused. A PR that solves one problem in one area is always preferred.

| PR Size | Description |
|---|---|
| ✅ **Ideal** | < 400 lines changed, one logical change |
| ⚠️ **Acceptable** | 400–800 lines, clearly scoped with good description |
| ❌ **Too large** | > 800 lines — break it up into smaller, sequential PRs |

---

## 👥 Project Maintainers

| Maintainer | GitHub | Role |
|---|---|---|
| Kamrul | [@mkamrul9](https://github.com/mkamrul9) | Project Lead & Admin |

Maintainers have the authority to:
- Triage and label all issues
- Assign issues to contributors
- Approve and merge pull requests
- Manage releases

---

*Thank you for contributing to KanbanSync! Every contribution, big or small, makes this project better. 🚀*
