Check that every file path and exported symbol quoted in AGENTS.md still exists in the codebase. Fix any that are stale.

## Steps

1. Read `AGENTS.md` in full.

2. Extract every backtick-quoted item that looks like a file path (contains `/` or `.ts`/`.tsx`/`.md`/`.json`) or a symbol name (functions, types, constants written in camelCase or PascalCase).

3. For each **file path**: verify it exists on disk using Glob. Note any that are missing.

4. For each **exported symbol**: search for it with Grep across `src/`. Note any that are missing or renamed.

5. For each stale reference found, update the corresponding line in `AGENTS.md` to match the current codebase. If a file was deleted with no replacement, remove or reword the sentence that referenced it.

6. After all edits, print a short summary:
   - Files checked
   - Symbols checked
   - Changes made (or "no changes needed" if everything was current)
