---
name: opus-review
description: Get a focused Opus 5.5 architecture opinion or review through Claude Code when the user explicitly requests it.
---

# Opus review

Use Opus sparingly as an external consultant. This skill does not change the coordinating Codex model. Do not invoke Claude merely because another skill mentions it as an optional reviewer.

## Prepare the packet

Create a Markdown packet in the current task's artifact folder (for a feature loop, `.ai/features/<slug>/`). Include the user's requirements, relevant project instructions, architecture/plan, concrete questions, and the selected file contents or diff needed to answer them. For code reviews include line numbers, the reviewed revision, and the exact changes including relevant untracked files. Keep secrets out of the packet. Do not copy the whole conversation or repository by default.

The bridge deliberately disables Claude's tools, installed customizations, MCP servers, and session persistence. It does not automatically read `AGENTS.md` or `CLAUDE.md`: include their relevant instructions in the packet. Claude can only assess the supplied context; do not describe its opinion as a full repository inspection or independent test run.

Ask for concrete tradeoffs, missing cases, and actionable findings. Ask it to distinguish blockers from preferences, state missing evidence, and avoid restating the packet. A standalone architecture request can ask for a proposed design instead of a code-review verdict.

## Run the bridge

Resolve `scripts/opus_review.py` relative to this skill's directory. Use Python 3; no third-party packages are needed:

```sh
python3 /absolute/path/to/opus-review/scripts/opus_review.py \
  --packet /absolute/path/to/task/opus-packet.md \
  --output /absolute/path/to/task/opus-review.json
```

It pins `claude-opus-5-5`, defaults to `medium` effort, allows `--effort high` or `xhigh` when requested, and times out after ten minutes. The output JSON contains the response, requested model/effort, packet hash, and provider model-usage data if returned. Output files must be new, so use round-specific filenames for subsequent consultations.

Run with a short shell yield and poll the returned session while keeping the user informed. Use `--dry-run` to inspect flags without contacting Claude. If the sandbox prevents the authorized call, use normal permission escalation for that same command; never disable tool approval or the OS sandbox as a workaround.

The user needs an authenticated Claude Code installation at version 2.1.280 or newer. On a missing-login error, explain that they must run `claude auth login` in their terminal. Do not request credentials in chat, substitute another model, or silently retry a failed/ambiguous billable call. A successful CLI process alone is insufficient: the bridge also checks the JSON error marker and result.

## Integrate the result

Read the saved result, attribute it to Opus, and evaluate its findings against the actual project evidence. Inspect returned `model_usage` for unexpected model routing and disclose any discrepancy; do not infer actual model identity solely from the requested flag. The coordinator decides the next step and performs any edits using the normal workflow. A standalone invocation means one consultation unless the user asks for more. An explicitly invoked `$opus-loop` authorizes its opening discussion, substantive user follow-ups in that discussion, closing review, and bounded closing rechecks; follow that workflow without asking for repeated authorization. An active feature-loop plan can also authorize specific further Opus passes. Merely mentioning either workflow does not invoke it.
