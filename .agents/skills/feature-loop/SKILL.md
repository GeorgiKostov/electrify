---
name: feature-loop
description: Run an opt-in feature workflow with Astra planning feedback, Sol implementation, and Astra review; consult Opus only when requested.
---

# Feature loop

Keep the current Codex chat as the coordinator and user-facing planner/reporter. Use native subagents for the feature work, not new sidebar chats or nested Codex CLI processes. This skill explicitly authorizes the following delegation when invoked. It does not select a different model for the coordinating chat.

## Roles and invocation

- Planning critic and code reviewer: `gpt-6-astra`, effort `high`, separate fresh agents for the two stages.
- Implementer and fixes: `gpt-6.1-sol`, effort `xhigh`.
- Optional architecture consultant: Opus 5.5 through the companion `$opus-review` skill, only when the user explicitly asks for Opus at that stage. Never call it just because the feature is complex.
- Respect explicit model/effort and workflow overrides. A request to use one model directly skips this loop. A planning-only request ends with the plan.

For native `spawn_agent`, use `fork_turns="none"` when specifying model and reasoning-effort overrides; provide a self-contained brief. Do not use a full-history fork with model overrides. Tell each worker its role, workspace, constraints, deliverable, and to avoid further delegation. If the necessary native tool/model is unavailable, disclose the limitation before choosing a materially different route; never label another model's work as Astra or Sol.

## Durable handoffs

Use the user's selected project and its applicable `AGENTS.md`. Create `.ai/features/<slug>/` for this task, or continue its existing folder. Put scratch files there rather than overwriting other tasks. Store only relevant context, without credentials.

Keep `brief.md`, `plan.md`, and a short `status.md` containing the stage, workspace, task folder, model choices, approval status, correction rounds used, Opus consultations already performed, and unresolved findings. Add feedback, implementation, and review reports as those stages occur. Record the revision and, for uncommitted changes, an exact diff snapshot or hash plus included untracked files. A HEAD hash alone does not identify an uncommitted implementation. These records should let a later chat resume the work without repeating completed stages or resetting the correction budget.

## Workflow

1. Discuss the outcome, relevant design choices, and constraints with the user. Write a brief with acceptance criteria and known unknowns. Ask only for decisions needed to proceed.
2. Ask Astra to examine the relevant code and critique the proposed approach: boundaries, data flow, edge cases, compatibility, and test strategy. Its role is read-only: return feedback to the coordinator, which saves `astra-feedback.md`. If the native tool offers a read-only sandbox, use it; otherwise say this is a role instruction, not filesystem enforcement.
3. Consolidate the architecture, implementation steps, acceptance criteria, and edge cases into `plan.md`. If an Opus architecture opinion was requested, use `$opus-review` now and integrate its findings. Present the plan and wait for approval unless the user has already approved it or explicitly authorized implementation without another gate. An earlier approval remains valid; do not ask twice. During a gate, continue only independent preparation that does not implement the unapproved feature.
4. Once authorized, give Sol the plan and ownership of implementation in the chosen workspace. Reuse a suitable worktree or use the app's managed worktree tools when isolation is needed. Preserve existing user changes. Only one agent writes implementation files at a time. Sol returns changes, validation evidence, and limitations for `impl-log.md`.
5. Once implementation is stable, give a fresh Astra reviewer the brief, plan, actual diff, and relevant code/tests. Have it inspect correctness, regressions, and uncovered acceptance criteria independently of Sol's self-assessment. Return findings with severity, file/line, concrete impact, and a suggested verification. Verdicts are `pass`, `changes-needed`, or `blocked`; distinguish unverified behavior from a pass. Save `astra-review.md`.
6. Send actionable findings to Sol. Allow at most two correction rounds by default, recording each round's implementation and review reports. Re-review fixes and affected behavior. Do not endlessly debate preferences: the coordinator resolves style disagreements against project conventions. Unresolved substantive findings after the cap remain visible and require a user decision; never claim completion while they remain.
7. If the user requested a final Opus architectural check, consult it with the actual changes and plan before closing the loop. Its findings share the same correction budget. Otherwise skip Opus. The coordinator then reads the final diff, checks the acceptance criteria, and independently verifies the result as appropriate. Save `final-review.md` and report the deliverable, checks performed, and any remaining limitations. A review of an earlier revision does not verify later changes.

## Tool ownership

Use the current chat's image-generation and other available specialized tools when the task needs them; pass saved asset paths and usage notes to Sol. Neither an image directory nor a CLI installation proves a tool is available. External Claude calls receive only the prepared packet and do not inherit this chat's tools or conversation.

Invoking this skill authorizes the described local coordination, not publishing, deployment, or unrelated external messages. Preserve the user's existing authorization for those actions rather than adding routine approval gates.
