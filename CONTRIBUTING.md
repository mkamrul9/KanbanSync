# Contributing to KanbanSync

Thank you for your interest in contributing! KanbanSync is a real-time Kanban board application built with **Next.js (App Router), Prisma, PostgreSQL, and Pusher**. This guide covers everything you need to go from zero to your first merged PR.

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Ways to Contribute](#-ways-to-contribute)
- [Reporting Bugs & Requesting Features (Issues)](#-reporting-bugs--requesting-features-issues)
- [Local Development Setup](#-local-development-setup)
- [Branching Strategy](#-branching-strategy)
- [Commit Message Conventions](#-commit-message-conventions)
- [Coding Standards](#-coding-standards)
- [Pull Request Process](#-pull-request-process)

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
| 📝 **Documentation** | Improve README, CONTRIBUTING, or inline JSDoc comments |
| 🔧 **Bug Fix** | Pick an open `bug` issue and submit a fix |
| 🚀 **New Feature** | Pick an open `enhancement` issue and implement it |
| 🎨 **UI/UX** | Improve the Next.js frontend UI components or styling |

---

## 🐛 Reporting Bugs & Requesting Features (Issues)

Issues are the primary communication channel for work in this repository. 

**To create an issue:**
1. Go to the Issues tab
2. Click **New Issue**
3. Select the appropriate template:
   - 🐛 **Bug Report** — for broken functionality
   - ✨ **Feature Request** — for new ideas or enhancements

### Issue Assignment
- **Contributors** should comment on an unassigned issue to express interest. A maintainer will assign it to you to avoid duplicate work.
- If an assigned issue has had no activity for **14 days**, it will be unassigned and reopened for others.

---

## 💻 Local Development Setup

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | v18+ |
| npm | v9+ |
| PostgreSQL | v14+ |

### Step 1 — Fork and Clone

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/<your-username>/KanbanSync.git
cd KanbanSync/kanbansync

# Add the upstream remote so you can sync with the main repo
git remote add upstream https://github.com/blue9kamrul/KanbanSync.git
```

### Step 2 — Environment Variables

Copy the `.env.example` file (if present) or create a `.env` file based on the required variables:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/kanbansync"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="..."
PUSHER_APP_ID="..."
PUSHER_SECRET="..."
```

### Step 3 — Install Dependencies & Database Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

### Step 4 — Run the Development Server

```bash
npm run dev
# Open the web UI at http://localhost:3000
```

---

## 🌿 Branching Strategy

We use a **feature-branch workflow**. **Never commit directly to `main`.**

### Branch Naming Conventions

All branches must follow this format: `<type>/<short-description>`

| Type | When to use | Example |
|---|---|---|
| `feat/` | New feature | `feat/drag-and-drop-columns` |
| `fix/` | Bug fix | `fix/task-modal-crash` |
| `refactor/` | Code improvement, no behaviour change | `refactor/board-actions` |
| `docs/` | Documentation changes only | `docs/update-readme` |
| `chore/` | Build, CI, dependency updates | `chore/bump-nextjs` |

---

## 📝 Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) strictly.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer: Closes #<issue-number>]
```

### Types

| Type | Usage |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that is not a fix or feature |
| `chore` | Build system, CI, dependency changes |
| `docs` | Documentation only |

### Examples

```bash
feat(board): add subtask drag and drop
fix(auth): handle expired session token gracefully
refactor(actions): extract common pusher triggers to utility
docs(readme): add docker setup instructions
```

---

## 🛠 Coding Standards

- **Strict TypeScript:** No `any`, no `@ts-ignore` without justification.
- **Server Actions:** All business logic modifying data should be encapsulated in Server Actions (`src/actions/*`).
- **JSDoc Comments:** Ensure complex utilities, components, and server actions have JSDoc annotations to aid contributors.
- **Formatting:** We use ESLint and Prettier. Ensure `npm run lint` passes before committing.
- **Real-time:** Use the `pusherServer` instance for backend broadcasting and `getPusherClient` for frontend subscriptions. Never import `pusherServer` in a Client Component.

---

## 🚀 Pull Request Process

### Before Opening a PR

- [ ] Your branch is up-to-date with `upstream/main`
- [ ] You have run `npm run lint` and resolved all errors
- [ ] Commit messages follow Conventional Commits format
- [ ] You have self-reviewed your diff on GitHub

### Opening the PR

1. Push your branch to your fork
2. Go to the upstream repository and click **"Compare & pull request"**
3. Select `main` as the base branch
4. Fill out the **Pull Request Template** fully
5. Link the issue your PR resolves: `Closes #<issue-number>`

### Review and Merge

- Address all requested changes with new commits.
- Once approved, a maintainer will **squash-merge** your PR into `main`.
- Your branch will be deleted after merge.

---

*Thank you for contributing to KanbanSync! Every contribution, big or small, makes this project better. 🚀*
