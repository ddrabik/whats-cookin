# Agent Planning Lessons

## Planning Lessons — Phase 1: Chat Interface (2026-02-08)

### What worked well

- **Step decomposition with clear dependencies** — Breaking the work into 8 steps with explicit dependency chains (schema → CRUD → chat action, schema → routes → UI) enabled aggressive parallelization. Steps 1+4+5 ran first, then 2+6 in parallel, then 3+7 in parallel.
- **Pattern references** — Pointing sub-agents to `convex/vision/actions.ts` for the `"use node"` + `internalAction` pattern and `vision/mutations.ts:46` for the scheduler pattern saved significant exploration time. Agents could copy the exact import/export structure.
- **TDD with pure functions** — Extracting `convertToOpenAIMessage`, `parseToolArguments`, `matchesSearchQuery`, and `formatRelativeTime` as pure exported functions made testing trivial — no mocks needed, tests run in milliseconds.
- **File manifest** — The explicit table of files to create/modify/rename prevented agents from accidentally touching unrelated files or creating files in wrong locations.
- **Existing UI component inventory** — Listing which shadcn components exist and how to use them (variant names, size props) prevented agents from guessing or importing non-existent components.

### What didn't work

- **Button `asChild` assumption** — The plan specified `<Button asChild><Link>` for the Cookbook link, but our Button component doesn't support `asChild` (no Slot import from Radix). The agent correctly detected this and used `navigate()` with `onClick` instead. Plans should check component APIs before specifying patterns.
- **Over-specified code blocks** — Providing near-complete code implementations in the plan meant agents were essentially copy-pasting rather than reasoning. This works but defeats the purpose of using intelligent agents. Better: specify the interface/contract and let agents implement.
- **Missing `listInternal` and `getInternal`** — The plan defined `searchInternal` in Step 4 but didn't mention `listInternal` and `getInternal` until Step 3 needed them. This created a gap the agent had to fill mid-implementation. All internal queries should be defined in the same step.

### Gaps

- **Auto-generated files** — The plan didn't account for `src/routeTree.gen.ts` and `convex/_generated/api.d.ts` needing to be committed. These regenerate when the dev server runs, and without running `npm run dev`, they can be stale.
- **Git rename tracking** — Moving `index.tsx → cookbook.tsx` requires staging both the deletion and creation in the same commit for git to detect it as a rename. The plan didn't mention this.
- **JSDoc placement** — When the agent inserted `formatRelativeTime` into `utils.ts`, it split the existing `formatQuantity` JSDoc from its function. Function insertion order matters when there are adjacent doc comments.

### Time sinks

- **Step 7 was the largest step** — It touched 8 files (3 new components, 2 route updates, 1 utility function, 1 test file, 1 layout update). Breaking this into "utility functions" + "components" + "route integration" would have been better.
- **Step 3 integration tests were dropped** — The plan specified mock-based integration tests for the chat respond loop, but these would require mocking the Convex `ctx` object and OpenAI client, which is complex in Vitest without convex-test. Pure function tests were sufficient for Phase 1.

### Concrete improvements for future plans

1. **Verify component APIs before specifying usage** — Check props/exports of UI components referenced in the plan
2. **Group all backend functions for a feature in one step** — Don't split `searchInternal` from `listInternal`/`getInternal`
3. **Cap steps at ~4 files each** — Large steps (7+ files) should be split for better parallelization and error isolation
4. **Specify interface, not implementation** — Give agents the function signatures, types, and test cases, but let them write the implementation
5. **Account for auto-generated files** — Note which files will be auto-regenerated and whether they need committing
6. **Include git operations in steps** — Specify rename vs delete+create, and note when staging order matters
