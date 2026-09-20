# HanaFuda repository instructions

## Development diary is mandatory

This is an AI-driven hackathon project. Every agent must leave a concise development diary entry for every task performed in this repository, including implementation, documentation, configuration, investigation, testing, and fixes.

### Where to write

- Diary directory: `docs/dev-diary/`
- File name: `YYYY-MM-DD.md`, using Japan Standard Time (Asia/Tokyo)
- Format and examples: `docs/dev-diary/README.md`

### Workflow

1. Before starting work, read `docs/dev-diary/README.md` and today's diary file if it exists.
2. Perform the requested work.
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

### Safety and clarity

- Write a useful summary, not a full chat transcript.
- Never record API keys, tokens, passwords, `.env` values, or other secrets.
- Avoid unnecessary personal information and raw command logs.
- If no files were changed, still record material investigation or decisions.
- Keep entries concise enough for teammates to scan quickly.

## Repository boundaries

- Frontend work belongs under `frontend/`.
- Backend work belongs under `backend/`.
- Shared product and team documentation belongs under `docs/`.
- Frontend contributors must not modify `backend/` unless the user explicitly changes this ownership rule.
- Frontend and backend integrate only through the agreed HTTP API and JSON contracts.
