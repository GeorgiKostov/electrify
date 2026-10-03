---
name: codex-consult
description: Ask Codex (Astra/Sol) from Claude Code for an independent review, a second implementation opinion, or image generation (concept art). Use when the user asks to "use Codex", "ask Astra", get a Codex review, or generate concept art with Codex.
---

# Codex consult (Claude Code → Codex)

The mirror of the Codex-side `opus-review` bridge. Claude Code stays the coordinator; Codex runs one non-interactive
job and writes its answer to a file. Use it only when the user asks for Codex, Astra, Sol, or Codex image generation.

## Find the CLI

- `codex` on PATH, or on macOS the ChatGPT app bundle:
  `/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex`.
- Check with `codex --version`. The user's `~/.codex/config.toml` sets the model (e.g. `gpt-6-astra`); pass `-m` only
  when the user names a different model (`gpt-6.1-sol` for implementation work).
- The user config may default to `sandbox_mode = "danger-full-access"` and `approval_policy = "never"`. **Always pass
  `-s` explicitly**: `read-only` for reviews, `workspace-write` for jobs that must write files.

## Prepare the job

1. Put a self-contained brief in `.ai/features/<slug>/` (or `docs/` for project-level reviews): requirements,
   relevant `AGENTS.md` rules, the files to read, concrete questions, expected output shape. No secrets.
2. Codex reads the repository itself (unlike the Opus bridge), so point it at paths rather than pasting files.

## Run

Review (read-only):

```sh
codex exec --skip-git-repo-check -C <repo> -s read-only \
  -o <repo>/docs/REVIEW_codex_<topic>.md "<prompt that references the brief>" > <repo>/.local/codex_<topic>.log 2>&1
```

Concept art (writes files):

```sh
codex exec --skip-git-repo-check -C <repo> -s workspace-write \
  -o <repo>/art/concept/NOTES.md "<art brief; save PNGs into art/concept/ with descriptive names>" > <repo>/.local/codex_art.log 2>&1
```

- Run long jobs in the background and tell the user they are running; do not poll in a tight loop.
- Network access is needed; if the Claude Code sandbox blocks it, request the normal permission escalation for that
  command.
- Output files must be new per round (`REVIEW_codex_<topic>_02.md`), never overwrite earlier results.
- Do not retry a failed or ambiguous billable run automatically; report it.

## Integrate

- Attribute results to Codex (and the model in the user's config). Verify claims about library APIs against docs
  before adopting them; record what was accepted or rejected in the relevant doc (decision log in
  `docs/ARCHITECTURE.md`).
- Look at generated images before presenting them; check for real brands, logos or people and note provenance in
  `docs/ASSETS.md`.
- `.local/` holds run logs and is git-ignored.
