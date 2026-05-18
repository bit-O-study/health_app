# AGENTS.md instructions for /Users/parkseryu/projects/health

## Codex Coding Guardrails

These project-local instructions adapt the former CLAUDE.md guidance for Codex.
They are intended to reduce unnecessary changes while preserving the existing
Codex/OMX autonomy contract: proceed on clear, reversible work; ask only when
ambiguity, risk, or missing authority would materially change the result.

## 1. Think Before Coding

Before implementing, state the working assumptions and success criteria briefly.
If multiple plausible interpretations would lead to meaningfully different code,
surface the tradeoff instead of silently choosing. Ask only when the ambiguity is
not discoverable from local context or a reasonable assumption would be risky.

When a simpler approach exists, prefer it and note the reason. Push back on
speculative scope, unnecessary abstractions, or changes that do not trace to the
request.

## 2. Simplicity First

Write the minimum code that solves the requested problem.

- Do not add features beyond the request.
- Do not introduce abstractions for single-use code.
- Do not add configurability or extension points without a current need.
- Do not add defensive error handling for impossible states.
- If the solution becomes large, re-check whether existing utilities or a
  smaller edit can solve it.

Prefer deletion, reuse, and existing project patterns before adding new code or
dependencies. Add dependencies only when explicitly requested or clearly required
and justified.

## 3. Surgical Changes

Touch only the files and lines needed for the task.

- Do not refactor adjacent code just because it is nearby.
- Do not reformat unrelated code.
- Match the existing local style, even when a different style would be preferred.
- Remove imports, variables, functions, and tests made unused by your own change.
- Mention unrelated dead code or issues in the final report instead of changing
  them unless asked.

Every changed line should be explainable from the user's request or from cleanup
made necessary by that change.

## 4. Goal-Driven Execution

Convert work into verifiable goals before editing.

For multi-step tasks, use a brief plan shaped like:

1. Identify the target behavior -> verify with local inspection or a failing test.
2. Implement the smallest change -> verify with the targeted test or check.
3. Run the appropriate regression check -> report the evidence and any gaps.

For bug fixes, prefer a reproducing test before the fix when practical. For
refactors, verify behavior before and after when existing tests make that
possible.

## 5. Verification Standard

Do not claim completion without fresh evidence.

Use the smallest validation that proves the claim:

- Targeted test for changed behavior.
- Typecheck, lint, build, or smoke test when the change affects shared code or
  user-facing behavior.
- Manual inspection only when automated checks do not exist or cannot run.

If verification cannot run, state why and provide the next-best evidence.
