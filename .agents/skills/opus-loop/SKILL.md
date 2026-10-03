---
name: opus-loop
description: Plan interactively with Opus, optionally ask Astra for feedback, build with Sol and Astra, and finish with an Opus architecture review.
---

# Opus loop

The current Codex chat coordinates the work and remains the user's interface. Opus 5.5 owns the opening architecture discussion and closing architecture review. Native Codex agents handle implementation and code review. Invoking this skill explicitly requests these Opus stages and the native delegation below; the user does not need to separately invoke `$opus-review` or `$feature-loop`.

This is an opt-in workflow for the current task. Preserve the user's model, effort, stage, and scope overrides. Do not invoke the separate feature-loop pipeline wholesale: its default Astra-first planning differs from this workflow.

## Roles

- **Opus 5.5:** architecture discussion, plan refinement, final architecture review. Use the installed sibling `opus-review` skill and its tested bridge. Resolve `../opus-review/SKILL.md` relative to this skill and read it before the first call. Reuse the bridge rather than copying it. Default effort is `medium`; honor requested overrides.
- **Astra (`gpt-6-astra`, `high`):** planning feedback only when requested; implementation analysis, independent code review, and narrowly assigned difficult fixes when useful.
- **Sol (`gpt-6.1-sol`, `xhigh`):** primary implementation and corrections.
- **Coordinator:** prepares context, relays attributed Opus answers, reconciles feedback with the user's decisions, manages handoffs, verifies the final result, and reports to the user. Never pretend this chat has switched to Opus.

Use native `spawn_agent` with `fork_turns="none"` for explicit model/effort selection and a self-contained task packet. Do not create sidebar chats or shell out to Codex for native workers. Give workers the actual workspace, relevant project instructions, task scope, and expected evidence; ask them not to delegate further. If tools or models are unavailable, report the limitation and do not silently substitute a model or claim a stage happened.

## Discussion and planning

1. Gather the idea, constraints, current architecture, and relevant project instructions. Start an Opus architecture consultation with the substantive information available; do not require a finished plan before involving Opus. Ask it for a proposed approach, key tradeoffs, edge cases, and any decisions needed from the user.
2. Present Opus's response with clear attribution and continue the conversation here. Forward substantive user follow-ups about the architecture to Opus along with a concise discussion history, prior decisions, and the new question. These follow-ups belong to the same explicitly requested Opus discussion; do not demand a new skill invocation for each turn. Status questions, acknowledgments, and implementation instructions do not themselves need another Opus call. A planning-only request stays in this phase.
3. If the user asks for Astra feedback, give Astra the current discussion and proposal plus relevant code access. Return its concrete objections and alternatives, preserving any disagreements. When the user asks Opus to respond or the discussion next requires Opus to refine the plan, include Astra's feedback. Do not start an unsolicited back-and-forth debate between models or call Astra automatically for every planning turn.
4. Consolidate the discussed design into `plan.md`: requirements, architecture, major decisions, edge cases, implementation steps, and acceptance criteria. Reflect Opus's actual proposal and the user's choices; do not substitute an unconsulted coordinator redesign. Present the plan for approval before implementation unless the user already approved that plan or explicitly waived that gate. Do not ask for approval again after it has been granted.

## Implementation and closing review

5. Give Sol the approved plan and ownership of the implementation. Astra can inspect hard implementation questions and return advice; if a difficult component or correction merits an Astra implementation task, assign it explicitly and hand off file ownership before it edits. One implementation writer at a time. Use the user's workspace or a suitable managed worktree, preserving unrelated user work. The coordinator runs image generation and other specialized tools when needed and passes assets to the implementer.
6. After implementation, use a fresh Astra reviewer to examine the actual changes, relevant surrounding code, tests, and acceptance criteria. Review is read-only by role; use a read-only sandbox when the tool exposes one, without claiming role instructions enforce filesystem isolation. Findings should include severity, file/line, concrete impact, and verification. Record `pass`, `changes-needed`, or `blocked`, with limitations. Send actionable fixes to Sol or an explicitly assigned Astra writer, then independently check the affected behavior.
7. Once the candidate passes code review and relevant validation, send Opus the approved plan, decisions, exact final changes, relevant surrounding code, and test evidence for the closing architecture review. This Opus call is required by the skill invocation even if the user did not separately request it. Ask whether the implementation satisfies the design and acceptance criteria, introduces architectural problems, or misses important edge cases. Opus assesses the supplied packet; it has no tools and cannot independently run tests or explore omitted files. Supply requested missing context before treating an incomplete opinion as a pass.
8. Address actionable closing findings with the Codex workers, then give Opus the corrected diff and relevant evidence for a focused closing recheck. The last Opus review must cover the final implementation snapshot; a later code change invalidates its previous sign-off. Default to at most two correction rounds total across Astra and Opus findings. Opus rechecks after those corrections are authorized by this workflow, but repeated calls without new evidence are not. If the cap is reached or a required review remains blocked, report the unresolved state and let the user decide whether to extend the loop. Never claim the full workflow is complete without its closing review.
9. The coordinator checks the final diff and validation evidence, records any limitations, and presents the result. This is a final verification/report, not another routine Opus consultation. If verification requires additional code changes, use the remaining correction budget and refresh affected reviews before claiming completion.

## Context and resumption

Use `.ai/features/<slug>/` in the selected project, continuing existing task records when available. Keep a concise `brief.md`, `discussion.md`, `plan.md`, and `status.md`, plus stage reports as they occur. Record the active stage, workspace, approved plan version, unresolved decisions/findings, correction rounds used, and completed Opus call filenames. Resume from these records rather than restarting the opening discussion or resetting the budget.

The Claude bridge has no persistent conversation: each call must include the relevant discussion, current decisions, project instructions, and selected code/docs explicitly. Save numbered packets and results such as `opus-plan-01-packet.md`, `opus-plan-01.json`, and `opus-final-01.json`; do not overwrite prior results. Include the reviewed commit and an exact diff snapshot/hash plus relevant untracked file contents so uncommitted work is identifiable. Keep credentials out of packets.

If the user arrives with an approved plan already discussed with Opus, continue at implementation. If they explicitly skip opening planning, honor that override. If they request discussion only, do not implement or run a closing implementation review. A switch to direct Sol/Astra work suspends this loop for that task unless the user says otherwise.

Do not retry failed or ambiguous billable calls automatically. Preserve their recorded status and explain the failure. Workflow invocation does not authorize publishing, deployment, or unrelated external messages; honor existing user authorization for those separately.
