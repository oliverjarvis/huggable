# Huggable — Design-System Plugin: Design Spec

- **Date:** 2026-06-30
- **Status:** Approved (brainstorming complete) → ready for implementation planning
- **Author:** Oliver Jarvis + Claude
- **Working name:** Huggable

---

## 1. Problem & goals

AI-generated UI converges on a recognizable "slop" aesthetic (Anthropic names the cause:
*distributional convergence* → Inter fonts, purple-on-white gradients, minimal animation).
We want Claude to **deterministically** produce **beautiful, coherent, creative** UI for
**React (web)** and **React Native**, and to **systematically migrate** existing codebases onto
a design system — without every screen becoming a one-off custom component.

Two capabilities:

1. **Create** coherent, distinctive design systems + components on demand. New components must
   adhere to the system *by construction*, and be **hierarchical** (higher-order components built
   from lower-order primitives).
2. **Migrate** an existing codebase onto the system — discovering needed components and designing
   them on the fly — incrementally and verifiably.

**Key research insight that shapes everything:** a context/registry that passes tokens to the model
*raises fidelity but does NOT guarantee determinism* (verified: v0's "registry → matching UI without
manual cleanup" claim was refuted 0-3). Therefore **determinism must come from a deterministic
enforcement layer (lint + codegen + audit), not from prompting alone.** Prompting/skills steer taste;
lint enforces the floor.

## 2. Locked decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Deliverable | **Installable Claude Code plugin** | Reusable across all apps |
| 2 | First proof | **track-stuff** (Expo/RN) | Exercises create + migration (off NativeWind); design-system-priority app; real messy surface |
| 3 | Web styling engine | **StyleX** | Typed `defineVars`/`createTheme`, build-time atomic CSS, shareable tokens |
| 4 | RN styling engine | **Shopify Restyle** | Type-enforced token/theme primitive ("the Radix of RN styling"); owned components built on top |
| 5 | Component model | **Owned (shadcn) + CVA-like variants** | We author styled components; `defineVariants` resolves variants to token styles (novel: CVA-on-non-Tailwind) |
| 6 | Web behavior lib | **Base UI** (provisional, re-confirm at web phase) | Successor to Radix (same people + MUI + Floating UI); modern composition; owned styled layer on top |
| 7 | RN behavior lib | **@rn-primitives** | Headless behavior used by react-native-reusables; we own styling |
| 8 | Distribution | **Per-app owned, scaffolded by the skill** | shadcn model; plugin is the only shared artifact; per-app creative identity |
| 9 | Token naming | **Purpose/role names** (`bg.canvas`, `text.body`, `surface.card`, `accent.default`) | Survives re-theming; M3/Carbon standard |
| 10 | Themes (first build) | **Light + dark + a brand-variant demo** | Proves the semantic re-pointing / multi-brand model |
| 11 | Visual verification | **Automated screenshot critique** | Boot Expo, capture, Claude critiques vs design plan ("picture worth 1000 tokens") |
| 12 | Codemod tool | **ts-morph** | TS-native; safer typed refactors + JSX on a TS codebase |
| 13 | Migration snap policy | **Hybrid** — auto-snap within tight tolerance, flag outliers | Fast where safe, careful where not |
| 14 | v0.1 scope | **Full** (all 4 skills + codegen + lint + migration + screenshot critique) | Coherent first slice, proven on track-stuff |

**Explicitly excluded:** Tailwind / NativeWind, Tamagui (aesthetic preference), shared central
design-system package (chose per-app owned).

## 3. Architecture — three layers

| Layer | Lives where | What it is |
|---|---|---|
| **1. The plugin** (shared, installed once) | `~/.claude/plugins/huggable` | Skills + scripts + ESLint plugin + design-knowledge base. The only shared artifact. |
| **2. Design-system instance** (per-app, owned) | each app repo, e.g. `track-stuff/src/design/` | `tokens.ts` (source), generated theme, owned components, `registry.json`. User owns/edits. |
| **3. The app** | app screens/features | Consumes its own design system. |

The plugin **never ships components** — it ships the ability to **generate, extend, and migrate**
them into an app (shadcn philosophy end-to-end).

## 4. The plugin contents

### Skills (SKILL.md, progressive disclosure; compose with existing `frontend-design` for taste and `writing-skills` for authoring)

1. **`huggable:establish`** — greenfield/first-time setup. Brief → *vocalize the system* gate →
   two-tier token source → wire codegen → seed base primitives. Calls `frontend-design` for
   aesthetic direction (so systems are creative, not generic).
2. **`huggable:add-component`** — create a component that adheres by construction: resolve to the
   lowest satisfying tier, **reuse existing lower primitives** (query `registry.json` first),
   generate token-based variants, must pass the linter before "done."
3. **`huggable:migrate`** — move an existing codebase onto the system (six phases, §8).
4. **`huggable:audit`** — deterministic gate: runs lint + screenshot critique; reports off-system
   values + anti-slop violations. Usable by user, by Claude mid-task, and in CI.

### Scripts (plain CLI — where determinism lives; runnable by Claude or in CI)

- **`tokens-codegen`** — one typed token source → StyleX `defineVars` (web) + Restyle theme (RN).
- **`eslint-plugin-huggable`** — off-system-value + anti-slop + tier-boundary rules (§9).
- **`migrate`** — ts-morph codemods (§8).
- **`registry`** — maintains each app's `registry.json` (component hierarchy + tokens); doubles as
  the v0-style **context manifest** fed to Claude so generation matches the system.

### Principle encoding rule

- **Mechanical/checkable** (scales, off-system values, anti-slop blacklist, numeric guardrails,
  tier boundaries) → **lint rules** (deterministic).
- **Taste/judgment** (spend boldness in one place, microcopy tells, "vocalize the system first,"
  motion budget) → **skill guidance + critique step** (steering).

## 5. Token layer (the spine)

One typed TS source per app (`src/design/tokens.ts`), **two tiers**:

- **Tier 1 — primitives:** raw, context-free values, never used directly in components.
  - `color` (palette incl. oklch-extended shades), `space` (Carbon ramp: 0,2,4,8,12,16,24,32,40,48,64,80,96,160 on 2/4/8),
    `radius`, `font` (display/body/mono — never banned fonts), `size` (type scale), `lineHeight`,
    `z`, `duration`, `easing`.
- **Tier 2 — semantic (purpose/role names):** reference primitives; **this is what components use.**
  - `color`: `bg.canvas`, `text.body`, `surface.card`, `border.subtle`, `accent.default`, …
  - `text`: composite type tokens (`body`, `heading`, `caption`).
  - `space`: pass-through / renamed-by-intent.

**Theming = re-pointing semantic tokens over the same primitives.** Light, dark, and a brand-variant
are three semantic maps. New brand/theme = new semantic map; components never change.

**Codegen** (`tokens-codegen`) reads the one source and emits both platforms (generated, never
hand-edited):
- **RN →** `theme.ts` via Restyle `createTheme({colors, spacing, textVariants, …})`, typed so
  `bg="#fff"` won't compile.
- **Web →** `tokens.stylex.ts` via `defineVars(...)` + `createTheme(...)` per theme, consumed via `props()`.

**Creative identity vs coherence:** `establish` (via `frontend-design`) chooses the *primitive values*
(distinctive display/body pairing, dominant+accent palette, radius personality, motion budget) per
brief. The *structure* (two tiers, scales, semantic names) is fixed/shared. → coherence from
structure, distinctiveness from values.

**Guardrails in the scales:** spacing exists only on the 2/4/8 ramp; type only on the scale; radii a
fixed set; min interactive size 44px. Off-ramp values aren't expressible as tokens; the linter catches
hardcoded workarounds.

## 6. Component hierarchy (the "no more one-offs" guarantee)

Five altitudes; **a component imports only from strictly lower tiers** (lint-enforced via `registry.json`):

| Tier | Name | Examples | May import from |
|---|---|---|---|
| T0 | Tokens | `tokens.ts` → theme | — |
| T1 | **Primitives** | `Box`, `Text`, `Stack`/`Row`/`Column`, `Pressable`, `Icon` | tokens only |
| T2 | **Elements** | `Button`, `Input`, `Badge`, `Avatar`, `Switch`, `Spinner` | T1 + tokens |
| T3 | **Compounds** | `Field`, `Card`, `ListItem`, `Dialog`, `Tabs` | T2, T1 |
| T4 | **Patterns** | `Form`, `Header`, `EmptyState`, screen scaffolds | T3, T2, T1 |

- **Primitives (T1)** = thin owned wrappers over Restyle `createBox`/`createText` (RN) / StyleX
  equivalents (web); accept **only token props** (`<Box bg="surface.card" p="4" radius="md">`).
- **Variants** = one tiny typed helper `defineVariants` resolving `<Button variant="primary" size="md">`
  to token-based styles, backed by Restyle's variant system (RN) and StyleX `create` variant objects
  (web). Same authoring API both platforms; no Tailwind/`tailwind-merge`. (The novel CVA-on-non-Tailwind piece.)
- **Generation reuses, never duplicates:** `add-component` resolves to the lowest tier that satisfies
  the request, composes from existing lower components, and creates new lower primitives only on a real
  gap (then registers them).
- **Behavior:** RN = `@rn-primitives`, web = Base UI — behavior-only deps; we own the styled component.

## 7. Generation flows & anti-slop gates

**`huggable:establish`:** intake brief (pin subject/audience/job if vague) → compose `frontend-design`
→ **vocalize the system before code** (4–6 named hex, display+body+mono pairing, spacing/type/radius
personality, motion budget, one signature element) → **self-critique vs anti-slop blacklist** (revise
defaults, state changes) → write T1 primitives → codegen → seed T1 components → critique pass (lint + visual).

**`huggable:add-component`:** request → query `registry.json` for reuse → resolve to lowest tier →
compose from lower components + `defineVariants` → lint gate → register edges.

**Merged anti-slop knowledge base** (from `frontend-design` + `claude-design.md` + research):
- **Mechanical → lint (blocking):** raw hex / off-ramp spacing / non-token fonts; banned fonts
  (Inter, Roboto, Arial, Open Sans, Lato, Fraunces); left-border-accent-only cards; emoji-as-icon;
  hand-drawn SVG imagery; sub-44px hit targets; sub-min font sizes; cross-tier imports.
- **Steered → guidance + critique:** spend boldness in one place; dominant+accent over timid palettes;
  atmosphere over flat fills; one orchestrated load animation over scattered micro-interactions; never
  converge across generations; microcopy tells ("It's not X, it's Y," verdict titles, "the magic
  moment," data slop).

## 8. Migration engine (`huggable:migrate`) — six phases

1. **Audit / discover** — inventory every styling source (NativeWind `className`, inline `style`,
   `StyleSheet.create`); build a frequency map of raw values; detect repeated JSX structures
   (candidate components). Output a reviewable audit report.
2. **Token reconciliation** — cluster raw values → map to nearest token or propose new tokens
   (near-grays → `surface.*`; spacings snap to ramp; infer type scale). Produces a reviewable
   value→token map; also seeds the initial palette/identity from what exists.
3. **Codemod (ts-morph)** — file-by-file: NativeWind utilities → token props on primitives
   (`className="p-4 bg-white rounded-lg"` → `<Box p="4" bg="surface.card" radius="lg">`); inline
   styles → token props; `StyleSheet` literals → token refs. **Unmappable values are flagged, never
   silently changed.**
4. **Component discovery & extraction** — repeated structures → owned components at the right tier,
   registered, usages replaced.
5. **Lint to green** — `huggable:audit` until off-system = 0 and tier boundaries hold.
6. **Visual regression** — before/after screenshots of key screens; Claude diffs for unintended drift.

**Snap policy:** hybrid — auto-snap within tight tolerance (≈±1–2px spacing; perceptually-near colors),
flag outliers for review.

**Safety model:** small batches with a **git checkpoint + visual-regression gate between each**; app
stays working; every batch reviewable/revertible. Incremental by screen, never big-bang.

## 9. Enforcement layer (`eslint-plugin-huggable`)

ESLint (not Stylelint — both engines are typed CSS-in-JS; matches Atlassian precedent). One plugin,
**engine-aware** (detects StyleX vs Restyle by imports), so one ruleset spans web + RN.

Rules:
- `no-raw-color` · `no-magic-spacing` · `no-offsystem-radius` — require token refs (Atlassian
  `domains: ['color','spacing',…]` model).
- `no-banned-fonts` — Inter/Roboto/Arial/Open Sans/Lato/Fraunces.
- `min-hit-target` (44px) · `min-font-size` — numeric guardrails.
- `tier-import-boundary` — reads `registry.json`; only-lower-tier imports.
- `prefer-primitives` — nudge raw `View`/`Text` → `Box`/`Text`.
- `no-antislop-patterns` — left-border-accent-only cards, emoji-as-icon (heuristic; warns).

**Escape hatch:** `// huggable-allow: <reason>` — deviations explicit, greppable, auditable.
Severity configurable per rule (mechanical = error, heuristic = warn). Runs in-editor, in
`huggable:audit`, and in CI (exit code = the determinism guarantee). Each rule ships `RuleTester` tests.

## 10. First proof on track-stuff + v0.1 scope

MVP milestone, in order:
1. **Plugin skeleton** — 4 skills + `tokens-codegen` + `eslint-plugin-huggable` + ts-morph `migrate`
   harness + screenshot/critique harness.
2. **Establish on track-stuff** — derive `tokens.ts` (palette/type via `frontend-design`, seeded from
   migrate-audit reconciliation) → codegen Restyle theme (light + dark + brand-variant) → seed T1
   primitives + a couple T2 (`Button`, `Input`) → `registry.json`.
3. **Migrate 2–3 representative screens** off NativeWind → extract repeated structures → `audit` green
   → before/after screenshots.
4. **Add one net-new component on the fly** via `add-component` → verify adherence + reuse.

**Success criteria:** off-system count → 0 on migrated screens; tier boundaries hold; screenshot
critique passes; app still runs; loop repeatable.

## 11. Testing strategy

TDD where it bites:
- ESLint rules → `RuleTester` cases (input code → expected violations).
- Codemods → fixture tests (input file → expected output file).
- `tokens-codegen` → snapshot tests (token source → generated StyleX + Restyle outputs).
- Skills → validated via `writing-skills`.
- End-to-end → the track-stuff proof itself (establish → migrate → add-component → audit green).

## 12. Open / deferred items

- **Base UI maturity** — re-confirm at the web phase (v0.2+); fall back to Radix if needed.
- **Web proof** (StyleX on a real Next app, e.g. hejsa-web) — deferred to v0.2.
- **Cross-platform token sharing** within a single product spanning web+RN (small in-repo core) —
  design accommodates it; not exercised until a dual-surface product needs it.
- **react-native-unistyles** — not chosen now; revisit only if Restyle runtime theme perf becomes a problem.

## 13. Research basis (verified sources)

- Design tokens as single source of truth; primitive→semantic two tiers — Material Design 3 (3-0).
- Mathematically-derived scales; prohibit off-scale spacing — Carbon (3-0).
- "AI slop" = distributional convergence; Skills = on-demand steering — Anthropic blog (3-0).
- `frontend-design` skill's four vectors (typography/color/motion/backgrounds) — Anthropic (3-0).
- StyleX typed token/theming (`defineVars`/`createTheme`/`props`) — StyleX docs (3-0).
- Restyle as type-enforced tokens-and-theme engine — Shopify (3-0).
- RN shadcn ports keep CVA but depend on NativeWind → custom variant layer needed — repos (3-0).
- Token-usage ESLint enforcement precedent — Atlassian `ensure-design-token-usage` (3-0).
- **Refuted (0-3):** "registry context → matching UI without manual cleanup." → determinism comes
  from enforcement, not prompting.
- Architecture cross-checked against the leaked **claude-design.md** (Claude design-mode prompt):
  base+semantic token files, anti-slop blacklist, microcopy tells, "vocalize the system first,"
  numeric guardrails, flex/grid-gap — adopted; its streaming-engine plumbing (inline-styles-only,
  no-tokens-file) explicitly rejected.
