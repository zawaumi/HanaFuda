<!-- PlannerDex:start -->
## PlannerDex

- Run `python3 tools/plannerdex.py resume` from the project root; select a task ID if listed. Read only relevant files and `.plannerdex/playbooks/work.md` when needed.
- Use `.plannerdex/project.json` for project-specific checks and risk paths. Empty checks mean unconfigured, never verified.
- Minimize total tokens while meeting acceptance criteria. Delegate only bounded independent work with clear ownership; normally use at most two concurrent helpers. Keep required independent review even when work is sequential.
- Only the coordinator writes its task state. Save decisions, evidence and the next action at meaningful checkpoints. Confirm interrupted workers and existing artifacts before reassigning writes.
- Verify integrated code; bind evidence to its snapshot. Report untested behavior and unknown token usage honestly. Follow current user instructions and applicable higher-priority guidance.
<!-- PlannerDex:end -->
