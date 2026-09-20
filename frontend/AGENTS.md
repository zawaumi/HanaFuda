<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HanaFuda frontend instructions

## Development diary is mandatory

This is an AI-driven hackathon frontend. Every agent must leave a concise development diary entry for every task performed under `frontend/`, including implementation, documentation, configuration, investigation, testing, and fixes.

### Where to write

- Diary directory: `frontend/docs/dev-diary/`
- File name: `YYYY-MM-DD.md`, using Japan Standard Time (Asia/Tokyo)
- Format and examples: `frontend/docs/dev-diary/README.md`

### Workflow

1. Before starting frontend work, read `frontend/docs/dev-diary/README.md` and today's diary file if it exists.
2. Perform the requested frontend work.
3. Before finishing the task, append one entry to today's diary file.
4. Include the diary update in the same branch and commit as the work whenever possible.
5. Never rewrite or delete another contributor's entries. Append corrections as a new note.

### Required content

Each entry must record:

- task or objective
- work completed
- important decisions and reasons
- files or areas changed
- checks or tests run and their results
- remaining work, risks, or handoff notes

### Safety and scope

- Write a useful summary, not a full chat transcript.
- Never record API keys, tokens, passwords, `.env` values, or other secrets.
- Avoid unnecessary personal information and raw command logs.
- If no files were changed, still record material investigation or decisions.
- Keep entries concise enough for teammates to scan quickly.
- This instruction applies only inside `frontend/` and must not impose workflow rules on `backend/` or other teams.
- Frontend contributors must not modify `backend/` unless the user explicitly changes this ownership rule.
