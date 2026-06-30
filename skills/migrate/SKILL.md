---
name: migrate
description: Use to move an existing codebase onto the Huggable design system incrementally and verifiably — discovering off-system values and components, mapping to tokens, and rewriting without blowing everything up.
---

# Migrate a codebase onto the system

Incremental and reversible, never a big-bang rewrite. Small batches, a git checkpoint and a review gate between each, the app working throughout.

## 1. Audit / discover
Inventory off-system values with `scanStyleValues` (`src/migrate/scan.ts`): raw colors and magic numbers (incl. negatives) across inline styles and `StyleSheet.create`. Note repeated JSX structures as candidate components.

## 2. Reconcile (hybrid snap)
Build a reviewable plan with `buildMigrationPlan` (`src/migrate/plan.ts`): values within tolerance auto-map to the nearest token; outliers are FLAGGED, never silently changed. If the system lacks a token a real value needs, propose adding it. Review the `{ mappings, flagged }` before touching code.

## 3. Codemod
Apply the approved mappings with `applyTokenCodemod` (`src/migrate/codemod.ts`) — it rewrites raw values to token references and is idempotent. Anything flagged stays flagged for human decision.

## 4. Extract components
Pull repeated structures into owned components at the right tier (via `huggable:add-component`), register them, and replace usages — this is how migration discovers the components the app actually needs.

## 5. Lint to green + verify
Run `huggable:audit` until off-system count is 0 on the batch and tier boundaries hold. Screenshot key screens before/after and diff for unintended drift.

## Safety
One batch = git checkpoint + audit + visual-regression gate, reviewable and revertible. Migrate by screen, not all at once.
