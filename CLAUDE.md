# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**meal-planner** - A meal planning application (architecture and implementation details to be added as the project develops).

## Development Commands

This is a fresh computer. If a task requires dependencies that are not yet installed, wait until I install them. Do not try to install yourself. Examples are node, git, python, and helpful CLI tools like gh.

### Start Development Server
```bash
npm run dev
```
Starts both TanStack Start dev server and Convex dev server concurrently.

### Convex Commands
```bash
npx convex dev      # Start Convex dev server (auto-deploys on save)
npx convex deploy   # Deploy to production
npx convex dashboard # Open Convex dashboard in browser
```

### Build & Lint
```bash
npm run build       # Build for production
npm run lint        # Run ESLint
```

## Architecture

- **Frontend**: TanStack Start (React) with file-based routing in `src/routes/`
- **Backend**: Convex (serverless functions + real-time database) in `convex/`
- **State Management**: TanStack Query + Convex reactive queries
- **Routing**: TanStack Router with type-safe routes
- **Build Tool**: Vite

## Git Workflow

- Feature branches follow the pattern: `claude/claude-md-documentation-W0wOc`
- Always develop on designated feature branches
- Use descriptive commit messages
