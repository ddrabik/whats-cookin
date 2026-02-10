# Agent Planning Lessons

Important: only add advice, leassons, and learnings that can apply across many projects. Single project or tech-specific learnings should go into the memory file.

### What works well

- **Step decomposition with clear dependencies** — Breaking the work into steps with explicit dependency chains (schema → CRUD → chat action, schema → routes → UI) enabled aggressive parallelization.
- **TDD with pure functions** — Extracting code as pure exported functions made testing trivial — no mocks needed, tests run in milliseconds.
- **File manifest** — The explicit table of files to create/modify/rename prevented agents from accidentally touching unrelated files or creating files in wrong locations.
- **Existing UI component inventory** — Listing which shadcn components exist and how to use them (variant names, size props) prevented agents from guessing or importing non-existent components.

### What doesnt work well
- **Over-specified code blocks** — Providing near-complete code implementations in the plan meant agents were essentially copy-pasting rather than reasoning. This works but defeats the purpose of using intelligent agents. Better: specify the interface/contract and let agents implement.

### Concrete improvements for future plans

**Verify component APIs before specifying usage** — Check props/exports of UI components referenced in the plan
**Verify SDK types before specifying access patterns** — Check actual type definitions in node_modules, especially for union/discriminated union types that may have changed between SDK versions
**Cap steps at ~4 files each** — Large steps (7+ files) should be split for better parallelization and error isolation
**Specify interface, not implementation** — Give agents the function signatures, types, and test cases, but let them write the implementation
**Account for auto-generated files** — Note which files will be auto-regenerated and whether they need committing
**Include git operations in steps** — Specify rename vs delete+create, and note when staging order matters
