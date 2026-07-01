# Huggable Plan 07 — track-stuff Proof (real-app migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Phased; each phase ends with a git checkpoint + "app still runs" gate. Later phases (component/screen migration) are iterative and app-driven, not fully pre-specified.

**Goal:** Prove Huggable end-to-end by fully migrating the real Expo app **track-stuff** onto it: package the plugin so an app can consume it, establish a real token system, rebuild the `src/ui` component layer on Restyle + `defineVariants`, migrate all screens, and get `audit` green with the app still running.

**Architecture:** Two repos. **huggable** gets a build (tsc → `dist/`) + `exports` + `eslint` as `peerDependency` so it is consumable. **track-stuff** consumes it via a local `file:` dependency, installs `@shopify/restyle` + `@rn-primitives`, receives owned scaffolded code (`src/design/tokens.ts`, generated theme, a copied `defineVariants`, rebuilt components), and wires the ESLint plugin into its flat config. Huggable's CLIs (`tokens-codegen`, migration) run against track-stuff via `tsx`.

**Tech Stack:** huggable (TS/ESM, tsc build). track-stuff (Expo 56, RN 0.85, React 19, expo-router, Convex, react-native-web, TS ~6). Adds `@shopify/restyle`, `@rn-primitives/*` to track-stuff.

## Global Constraints

- **Safety first:** track-stuff is the user's real, design-system-priority app. Work on a branch; git checkpoint + `expo start` smoke (or typecheck + lint) gate between phases; every phase is reversible.
- Node ≥ 20; strict TS. No Tailwind/NativeWind (remove the dead `tailwindcss` dep + inert `className` usage as part of migration).
- Owned/scaffolded model: components + tokens + `defineVariants` live IN track-stuff (owned, editable). The ESLint plugin resolves via `file:` dep.
- Preserve behavior: the app must still run and its screens function after each phase. No feature changes, only styling/structure migration.
- Off-system values must reach 0 on migrated files (huggable-allow only with a reason).

---

## Phase A — Make Huggable consumable + wire track-stuff (concrete)

Delivers: huggable builds to `dist/` with a clean public API; track-stuff can `file:`-depend on it, lint with the plugin, and run the codegen. This de-risks everything downstream. Work in the **huggable** repo on branch `feat/plan-07a-packaging`, then track-stuff on `feat/huggable-migration`.

### Task A1: Build + public exports for huggable
- Add a build: `tsconfig.build.json` (emit `dist/`, declarations) + `"build": "tsc -p tsconfig.build.json"` script; set `"main"`, `"types"`, and an `"exports"` map exposing the public API (`./eslint`, `./variants`, `./registry`, `./tokens`, `./migrate`, `./cli/tokens-codegen`). Add `"files": ["dist"]`.
- Move `eslint` from `dependencies`/`devDependencies` to `peerDependencies` (keep it as a devDep too for the plugin's own tests) so a consumer supplies its own ESLint.
- Verify: `npm run build` emits `dist/` with `.js` + `.d.ts`; `npm test` still green; a smoke `node -e "require('./dist/eslint/index.js')"` (or ESM import) resolves the plugin.
- Commit; open PR; merge (per PR workflow).

### Task A2: track-stuff setup
- On a `feat/huggable-migration` branch in track-stuff: add `@shopify/restyle`, `@rn-primitives/slot` (+ any needed `@rn-primitives/*`), and `eslint-plugin-huggable` via `"file:../huggable"` (or a relative path) to devDependencies. `npm install`.
- Add a flat ESLint config (`eslint.config.mjs`) that uses `@typescript-eslint/parser` and the huggable plugin's `configs.recommended`. Confirm `npx eslint src` RUNS (it will report existing off-system values — that is expected and becomes the migration worklist).
- Verify: `expo start` still boots (deps install cleanly); `npx eslint src` runs and produces a findings list. Git checkpoint.

## Phase B — Establish the token system (uses `huggable:establish`)

Delivers: `track-stuff/src/design/tokens.ts` (a real two-tier `TokenSource`) + generated `theme.ts` (Restyle) wired through a `ThemeProvider`.

- Run `huggable:migrate` **audit-only** first (`scanStyleValues` + `buildMigrationPlan`) over `src/` to inventory the real colors/spacings and seed reconciliation against the existing `src/constants/theme.ts` (light/dark hex, Fonts).
- Compose `frontend-design` for aesthetic direction; vocalize the system; author `tokens.ts` (Tier-1 primitives from the reconciled values + a distinctive, non-slop identity; Tier-2 semantic maps: `bg.canvas`, `surface.card`, `text.body`, `accent.default`, etc.; light + dark + a brand variant).
- Run `tokens-codegen` (via `tsx ../huggable/src/cli/tokens-codegen.ts --in src/design/tokens.ts --out-dir src/design --target rn`) to emit `theme.ts`. Wrap the app in Restyle's `ThemeProvider`.
- Copy `defineVariants` (+ its types) into `src/design/variants.ts` (owned).
- Verify: typecheck passes; app boots with the provider. Git checkpoint.

## Phase C — Rebuild the component layer (uses `huggable:add-component`)

Delivers: `src/ui` rebuilt on the new system, registered, tier-clean.

- Rebuild T1 primitives (`Box`, `Text`, `Stack`, `Pressable`, `Icon`) on Restyle `createBox`/`createText` against the generated theme (token-only props).
- Rebuild the existing components (`Button`, `Card`, `Input`, `Text`, `Screen`) as T2/T3 on the primitives + `defineVariants` (replace the dead `className` variant maps with token-based variants; behavior via `@rn-primitives` where needed). Keep the same public props so screens need minimal changes.
- Build `registry.json` and run `validateTierBoundaries`.
- Verify per component: typecheck + `eslint` clean on that file (0 off-system) + it renders. Git checkpoint per component or small batch.

## Phase D — Migrate the screens (uses `huggable:migrate`)

Delivers: all screens (`(tabs)/index|history|explore`, `tracker/[id]`, `shared/[id]`, layouts) using the rebuilt components + token props; dead `className`/inline/`StyleSheet` off-system values removed or `huggable-allow`'d with a reason.

- One screen per batch: run the codemod / hand-migrate raw values to token props via the new components, extract any repeated structure into a registered component (`add-component`), then `eslint` to 0 off-system on that screen.
- Git checkpoint + app-still-runs after each screen. Screenshot before/after where feasible.

## Phase E — Audit, cleanup, verify

- Remove the dead `tailwindcss` dependency and any remaining inert `className` scaffolding.
- Run `huggable:audit` across `src/`: eslint 0 errors, tier boundaries hold, no unexplained `huggable-allow`.
- Boot the app (`expo start`, web + a simulator if available), screenshot the key screens, and critique against the vocalized design plan (the manual visual loop; the automated capture harness is Plan 05).
- Verify: app runs, all screens function, typecheck + lint green. Open the track-stuff migration PR.

---

## Notes for the executor

- **This plan is phased, not fully pre-specified.** Phases A–B are concrete. Phases C–E are app-driven: use the Huggable skills + tools and adapt to what the real code needs, keeping the safety gates.
- **Resolve the migration signal-quality carry-overs as they bite** (recorded in the SDD ledger): broaden `STYLE_NUMBER_PROPS`; handle `rgb()/rgba()`/alpha for the *nearest* while keeping alpha colors flagged; pick a `distance` sentinel. Feed real fixes back to the huggable repo (separate PRs) rather than one-offing them in track-stuff.
- **Plan 03b rules** (`tier-import-boundary` ESLint rule wrapping `validateTierBoundaries`, `min-font-size`) are nice-to-have here; add if a real need surfaces during audit.
- Expect the first real run to expose plugin gaps. That is the point of the proof. Capture each gap as a huggable issue/PR.
