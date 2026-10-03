# Claude Code notes

@AGENTS.md

Claude-specific additions:

- Claude Code is Opus here. It owns the design and architecture docs and reviews milestone results; it does not
  need the `opus-review` bridge (that is how **Codex** reaches Opus). To reach Codex, use `codex-consult`.
- When reviewing a milestone, read the actual repo and run the checks rather than trusting the packet. Write
  `.ai/features/<slug>/opus-review-NN.md` (new number per round) with verdict `pass` / `changes-needed` /
  `blocked`, findings by severity with file:line, and any doc changes made.
- Use the in-app browser to verify UI at the viewports in `docs/DESIGN_LANGUAGE.md` §4.3.
