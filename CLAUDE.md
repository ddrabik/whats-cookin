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

### Testing & Type Checking
```bash
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run lint        # Run TypeScript compiler AND ESLint (use this!)
```

**IMPORTANT**: Always run `npm run lint` after implementing features to catch both TypeScript and ESLint errors before committing. This command runs both `tsc` (TypeScript compiler) and `eslint` (code quality checks including Convex-specific rules).

## Architecture

- **Frontend**: TanStack Start (React) with file-based routing in `src/routes/`
- **Backend**: Convex (serverless functions + real-time database) in `convex/`
- **State Management**: TanStack Query + Convex reactive queries
- **Routing**: TanStack Router with type-safe routes
- **Build Tool**: Vite

## Git Workflow

- Create a feature branch to contain the changes related to the feature being built.
- Feature branches follow the pattern: `claude/{feature_description}`
- Always develop on designated feature branches
- Use descriptive commit messages
- Commit often
- Create a PR when ready to merge into main
