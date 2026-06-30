---
name: audit
description: Use to check that UI is on-system before calling it done; it runs the Huggable lint floor (and, where a runnable app exists, a screenshot critique) and reports off-system values + anti-slop violations.
---

# Audit on-system-ness

The deterministic gate. Lint catches what is mechanical; the critique catches what is judgment.

## 1. Lint
Run ESLint with the Huggable plugin (`src/eslint/`), using its recommended flat config (`configs.recommended` exported from `src/eslint/index.ts`): `no-raw-color` and `no-banned-fonts` (errors), `no-magic-number` (warn). Off-system values surface here. A deviation is acceptable ONLY with an explicit `// huggable-allow: <reason>` comment; treat any unexplained allow as a finding.

## 2. Tier boundaries
Confirm component imports respect the hierarchy via `validateTierBoundaries` (`src/registry/validate-tiers.ts`): a component may import only from strictly lower tiers (primitive < element < compound < pattern). Any violation means a higher-order component is reaching sideways/up; fix the composition.

## 3. Visual critique (when a runnable app exists)
Boot the app, screenshot the key screens, and critique them against the vocalized design plan: is the signature element doing the memorable work? Is boldness spent in one place? Does anything read as a templated default? A picture is worth 1000 tokens. (The capture harness is delivered in a later plan; until then, do this review manually.)

## Output
Report: off-system value count (target 0 on touched files), any tier violations, any unexplained `huggable-allow`, and the critique verdict. "Done" = all clear.
