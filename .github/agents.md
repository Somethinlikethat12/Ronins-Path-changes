# Agent Orchestration Guide

This file defines how the orchestrator (Opus 5.5) delegates work to a fleet of smaller AI agents in this repository.

## Roles

### Orchestrator (Opus 5.5)
- Owns planning, task decomposition, delegation, review, and integration.
- Delegates bulk edits to worker agents.
- Resolves conflicts between agent outputs and makes final decisions.
- Verifies results meet acceptance criteria before marking work done.

### Worker Agents (smaller models)
- Execute one narrowly scoped task at a time.
- Touch only the files listed in their task.
- Report results in the format defined below.

## Worker Types

| Agent | Responsibility | Scope |
|-------|----------------|-------|
| `coder` | Implement a feature or fix | Specified source files |
| `tester` | Write/update tests, run suite | Test files |
| `refactorer` | Mechanical refactors, renames, formatting | Specified files |
| `docs` | Update README, comments, docs | Markdown, docstrings |
| `reviewer` | Review diffs for bugs and regressions | Read-only |
| `explorer` | Search and summarize code | Read-only |

## Workflow

1. **Analyze**: Understand the request and inspect relevant code.
2. **Decompose**: Split into small tasks with clear file boundaries.
3. **Delegate**: Send tasks using the template below; run independent tasks in parallel.
4. **Collect**: Gather worker reports.
5. **Review**: Check diffs against acceptance criteria; send fixes back if needed.
6. **Integrate**: Merge results, run build and tests, resolve conflicts.
7. **Report**: Summarize the outcome to the user.

## Task Template

    Task ID: <short-id>
    Agent: <agent type>
    Goal: <one-sentence objective>
    Context: <background, relevant files/symbols>
    Files allowed to edit: <explicit list>
    Files off-limits: <everything else>
    Constraints: <style, APIs, no new dependencies>
    Acceptance criteria:
    - <verifiable condition>
    Dependencies: <task IDs or "none">

## Report Format (Worker -> Orchestrator)

    Task ID: <id>
    Status: done | blocked | failed
    Summary: <what changed, 1-3 sentences>
    Files changed: <list>
    Verification: <commands run and results>
    Open issues: <questions, risks, or "none">

## Rules for All Agents

- Stay within the assigned scope; never edit files outside the allowed list.
- Follow existing code style and conventions.
- Do not add dependencies without orchestrator approval.
- Never commit secrets or credentials.
- Make no unrelated changes; keep changes minimal.
- If blocked or the task is ambiguous, report `blocked` instead of guessing.

## Parallelization

- Run tasks in parallel only when they edit disjoint files.
- Serialize tasks that share files or depend on each other's output.
- Prefer many small tasks over a few large ones.

## Escalation

Workers escalate to the orchestrator when requirements conflict, changes are needed outside allowed files, unrelated tests fail, or the task is larger than expected.

## Definition of Done

- Acceptance criteria met.
- Build and tests pass.
- Diff reviewed and approved.
- No unrelated changes.
