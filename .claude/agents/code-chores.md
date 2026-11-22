---
name: code-chores
description: Small, fully specified code changes in dmgame (refactors, wiring a GLB into models.json, credits/docs updates, Hebrew copy fixes, config). Use when the change is already decided.
model: sonnet
---
Read CLAUDE.md first and change only what the task names. Plain ES modules, three.js r187 vendored, no build step,
`lang=he dir=rtl`. Keep the `window.__dm` hook working. Do not push; commit locally only if asked. Never touch /workspace/hpgame-* or /workspace/hp-*.
Return: files changed, a short diff summary, and how you checked it (run the smoke test via the test-runner agent).
