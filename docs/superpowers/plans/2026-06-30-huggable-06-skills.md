# Huggable Plan 06 — The 4 Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the four Huggable skills (`establish`, `add-component`, `migrate`, `audit`) that orchestrate the built engine (token codegen, `defineVariants`, registry/tier enforcement, ESLint plugin, migration engine) and compose with the `frontend-design` taste layer — plus a validation harness so the skills are tested (valid frontmatter + no broken `src/` references), not just prose.

**Architecture:** Skills are `skills/<name>/SKILL.md` files (auto-discovered by Claude Code from the plugin's `skills/` dir; invoked as `huggable:<name>`). A pure `validateSkillFile` function checks each skill's frontmatter and that any `src/...` path it references exists on disk; a Vitest test runs it over all four skills. The skill *content* encodes the determinism-vs-taste split: mechanical steps point at the scripts/lint; judgment steps defer to `frontend-design` and the anti-slop knowledge base.

**Tech Stack:** TypeScript (strict, ESM), Vitest, Node `fs`. Same repo/toolchain as Plans 01–04. No new deps.

## Global Constraints

- Node ≥ 20; TypeScript `strict: true`; ESM with `.js` import specifiers.
- Each SKILL.md begins with YAML frontmatter containing at least `name:` and `description:` (description is trigger-oriented: "Use when…").
- Skills are concise (progressive disclosure) and reference REAL built modules by path: tokens (`src/cli/tokens-codegen.ts`, `src/tokens/`), components (`src/variants/define-variants.ts`, `src/registry/`), lint (`src/eslint/`), migration (`src/migrate/`).
- Skills compose with the existing `frontend-design` skill for aesthetic direction — they do NOT duplicate taste guidance; they add structure + determinism.
- Any `src/...` path a skill mentions MUST exist (the validation harness enforces this).

---

### Task 1: Skill validation harness

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/skills/validate.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/skills/validate.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `validateSkillFile(markdown: string, opts: { repoRoot: string; exists: (relPath: string) => boolean }): string[]` — returns error messages (empty = valid). Checks: (1) frontmatter block present with non-empty `name` and `description`; (2) every `src/...` token mentioned in the body resolves via `exists`. `exists` is injected so the function stays pure/testable.

- [ ] **Step 1: Write the failing test**

```ts
// test/skills/validate.test.ts
import { describe, it, expect } from "vitest";
import { validateSkillFile } from "../../src/skills/validate.js";

const ok = `---
name: establish
description: Use when creating a new design system.
---
Run the codegen at \`src/cli/tokens-codegen.ts\`.`;

const exists = (p: string) => p === "src/cli/tokens-codegen.ts";

describe("validateSkillFile", () => {
  it("passes a well-formed skill whose src refs exist", () => {
    expect(validateSkillFile(ok, { repoRoot: "/x", exists })).toEqual([]);
  });
  it("flags missing frontmatter name/description", () => {
    const bad = `---\nname:\ndescription:\n---\nbody`;
    const errs = validateSkillFile(bad, { repoRoot: "/x", exists });
    expect(errs.some((e) => /name/i.test(e))).toBe(true);
    expect(errs.some((e) => /description/i.test(e))).toBe(true);
  });
  it("flags a referenced src path that does not exist", () => {
    const bad = `---\nname: x\ndescription: y\n---\nSee \`src/does/not-exist.ts\`.`;
    const errs = validateSkillFile(bad, { repoRoot: "/x", exists });
    expect(errs.some((e) => /src\/does\/not-exist\.ts/.test(e))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/skills/validate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the validator**

```ts
// src/skills/validate.ts
export interface ValidateOpts {
  repoRoot: string;
  exists: (relPath: string) => boolean;
}

/** Matches src/... path tokens (word chars, /, ., -) ending in a file extension. */
const SRC_REF = /src\/[\w./-]+\.[a-z]{2,4}/g;

export function validateSkillFile(markdown: string, opts: ValidateOpts): string[] {
  const errors: string[] = [];

  const fm = /^---\s*\n([\s\S]*?)\n---/.exec(markdown);
  if (!fm) {
    errors.push("missing frontmatter block (--- ... ---)");
  } else {
    const body = fm[1];
    const name = /^name:\s*(.*)$/m.exec(body)?.[1]?.trim();
    const description = /^description:\s*(.*)$/m.exec(body)?.[1]?.trim();
    if (!name) errors.push("frontmatter is missing a non-empty name");
    if (!description) errors.push("frontmatter is missing a non-empty description");
  }

  const seen = new Set<string>();
  for (const match of markdown.matchAll(SRC_REF)) {
    const ref = match[0];
    if (seen.has(ref)) continue;
    seen.add(ref);
    if (!opts.exists(ref)) errors.push(`referenced path does not exist: ${ref}`);
  }

  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/skills/validate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(skills): add validateSkillFile (frontmatter + src-ref checks)"
```

---

### Task 2: `establish` + `audit` skills

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/skills/establish/SKILL.md`
- Create: `/Users/olliejarvis/Development/huggable/skills/audit/SKILL.md`
- Test: `/Users/olliejarvis/Development/huggable/test/skills/skills.test.ts`

**Interfaces:**
- Consumes: `validateSkillFile`, Node `fs`.
- Produces: two SKILL.md files + a test that runs `validateSkillFile` (with a real `exists` backed by `fs.existsSync` relative to the repo root) over every `skills/*/SKILL.md` and asserts zero errors.

- [ ] **Step 1: Write the failing test**

```ts
// test/skills/skills.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSkillFile } from "../../src/skills/validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillsDir = join(repoRoot, "skills");

describe("huggable skills", () => {
  const names = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

  it("has the four skills", () => {
    expect(names.sort()).toEqual(["add-component", "audit", "establish", "migrate"]);
  });

  for (const name of names) {
    it(`${name}/SKILL.md is valid (frontmatter + src refs exist)`, () => {
      const md = readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
      const errors = validateSkillFile(md, { repoRoot, exists: (rel) => existsSync(join(repoRoot, rel)) });
      expect(errors).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/skills/skills.test.ts`
Expected: FAIL — `skills` dir / files missing (and the "four skills" assertion fails). This task creates 2 of the 4; the suite goes fully green in Task 3.

- [ ] **Step 3: Author `skills/establish/SKILL.md`**

```markdown
---
name: establish
description: Use when creating a new Huggable design system for an app or brief (greenfield, or seeding from an existing app's values). Produces a coherent, distinctive token system and seeds primitives — not a generic default.
---

# Establish a design system

You are setting up a per-app, owned design system. Coherence comes from a fixed structure; distinctiveness comes from the values you choose. Do both.

## 1. Pin the brief
Name the subject, audience, and the product's single job. If the brief is vague, pin it yourself and state your choice. Use any memory of the human's preferences.

## 2. Get aesthetic direction (do not skip)
Invoke the `frontend-design` skill for taste: the distinctive display+body type pairing, a dominant+accent palette, radius/motion personality, and the one signature element. Huggable adds structure; `frontend-design` provides the point of view.

## 3. Vocalize the system BEFORE writing code
State, in prose: 4–6 named hex colors, the display/body/mono typefaces, the spacing/type/radius personality, the motion budget, and the signature element. Then self-critique against the anti-slop list below and revise anything that reads as a default — say what you changed and why.

## 4. Write the token source
Author `tokens.ts` as a two-tier `TokenSource` (see the type at `src/tokens/types.ts`): Tier-1 primitives (raw palette incl. oklch-extended shades, the Carbon-style even spacing ramp, radii, type scale, font families — never a banned font) and Tier-2 semantic maps with purpose/role names (`bg.canvas`, `text.body`, `surface.card`, `accent.default`). Ship light + dark (+ a brand variant) as semantic maps over the same primitives.

## 5. Generate + seed
Run the codegen CLI at `src/cli/tokens-codegen.ts` (`--in tokens.ts --out-dir <app>/src/design --target rn|web|both`) to emit the Restyle theme (RN) and StyleX vars (web). Seed the Tier-1 primitives (Box/Text/Stack/Pressable/Icon) on the generated theme. Build variants with the `defineVariants` helper at `src/variants/define-variants.ts`. Register components via `src/registry/build-registry.ts`.

## 6. Critique
Run `huggable:audit`. Nothing is "done" until lint is green and the visual critique passes.

## Anti-slop (mechanical → lint; judgment → here)
Avoid: containers with rounded corners + left-border accent only; bluish-purple gradients; emoji-as-icon; hand-drawn SVG imagery; the fonts Inter/Roboto/Arial/Open Sans/Lato/Fraunces; "data slop" (unneeded numbers/stats). In copy, avoid Claude's tells: "It's not X, it's Y", verdict titles, "the magic moment". Spend boldness in ONE place; keep the rest quiet.
```

- [ ] **Step 4: Author `skills/audit/SKILL.md`**

```markdown
---
name: audit
description: Use to check that UI is on-system before calling it done — runs the Huggable lint floor (and, where a runnable app exists, a screenshot critique) and reports off-system values + anti-slop violations.
---

# Audit on-system-ness

The deterministic gate. Lint catches what is mechanical; the critique catches what is judgment.

## 1. Lint
Run ESLint with the Huggable plugin (`src/eslint/`), using its recommended flat config (`configs.recommended` exported from `src/eslint/index.ts`): `no-raw-color` and `no-banned-fonts` (errors), `no-magic-number` (warn). Off-system values surface here. A deviation is acceptable ONLY with an explicit `// huggable-allow: <reason>` comment — treat any unexplained allow as a finding.

## 2. Tier boundaries
Confirm component imports respect the hierarchy via `validateTierBoundaries` (`src/registry/validate-tiers.ts`): a component may import only from strictly lower tiers (primitive < element < compound < pattern). Any violation means a higher-order component is reaching sideways/up — fix the composition.

## 3. Visual critique (when a runnable app exists)
Boot the app, screenshot the key screens, and critique them against the vocalized design plan: is the signature element doing the memorable work? Is boldness spent in one place? Does anything read as a templated default? A picture is worth 1000 tokens. (The capture harness is delivered in a later plan; until then, do this review manually.)

## Output
Report: off-system value count (target 0 on touched files), any tier violations, any unexplained `huggable-allow`, and the critique verdict. "Done" = all clear.
```

- [ ] **Step 5: Run the test (expect the per-skill validations to pass; the "four skills" count still fails until Task 3)**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/skills/skills.test.ts`
Expected: the `establish` and `audit` per-file validation tests PASS; the "has the four skills" test FAILS (only 2 exist). This is expected — Task 3 adds the other two and turns the suite green.

- [ ] **Step 6: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(skills): add establish + audit SKILL.md + skill validation test"
```

---

### Task 3: `add-component` + `migrate` skills

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/skills/add-component/SKILL.md`
- Create: `/Users/olliejarvis/Development/huggable/skills/migrate/SKILL.md`

**Interfaces:**
- Consumes: the Task 2 test harness (no new test file; the existing `skills.test.ts` will now find all four and go green).
- Produces: two SKILL.md files; the `skills.test.ts` suite passes fully (four skills, all valid).

- [ ] **Step 1: Author `skills/add-component/SKILL.md`**

```markdown
---
name: add-component
description: Use when a new UI component is needed, to create it so it adheres to the design system by construction (reuses lower-tier primitives, token-only styles, passes lint) instead of becoming a one-off.
---

# Add a component that adheres by construction

The rule that prevents every screen becoming custom: build the new component from existing lower-order ones; only create a new primitive on a real gap.

## 1. Resolve, don't reinvent
Query the component registry (`src/registry/build-registry.ts`) first. Resolve the request to the LOWEST tier that satisfies it, and compose from components that already exist. Create a new lower-tier primitive only if there is a genuine gap — then register it.

## 2. Token-only styles
Style exclusively through token props on the primitives (`<Box bg="surface.card" p="5" radius="md">`) — never raw hex/numbers. Express variants with `defineVariants` (`src/variants/define-variants.ts`): base + variant groups + defaults (+ compound/boolean), returning token-keyed style props.

## 3. Behavior
For accessible behavior, build on the headless layer (RN: @rn-primitives; web: Base UI) — own the styled component, depend only on the behavior.

## 4. Register + gate
Record the component's tier + dependencies in the registry. It is not "done" until `validateTierBoundaries` (`src/registry/validate-tiers.ts`) is clean and `huggable:audit` is green.

## Hierarchy
primitive (Box/Text/Stack/Pressable/Icon) < element (Button/Input/Badge…) < compound (Field/Card/Dialog…) < pattern (Form/Header/EmptyState…). A component imports only from strictly lower tiers.
```

- [ ] **Step 2: Author `skills/migrate/SKILL.md`**

```markdown
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
```

- [ ] **Step 3: Run the full skills suite to verify it goes green**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/skills/skills.test.ts`
Expected: PASS — "has the four skills" now passes, and all four per-skill validations pass (frontmatter present; every `src/...` reference resolves).

- [ ] **Step 4: Run full suite + typecheck**

Run: `cd /Users/olliejarvis/Development/huggable && npm test && npm run typecheck`
Expected: all tests pass (Plans 01–04's 92 + this plan's cases); `tsc --noEmit` exits 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(skills): add add-component + migrate SKILL.md (skills suite green)"
```

---

## Self-Review

**1. Spec coverage (this plan = the 4 orchestration skills):**
- `establish` (vocalize-the-system gate, frontend-design composition, token authoring + codegen, anti-slop) — Task 2 ✓
- `audit` (lint floor + tier check + visual critique) — Task 2 ✓
- `add-component` (registry reuse, token-only + defineVariants, tier gate) — Task 3 ✓
- `migrate` (scan → reconcile → codemod → extract → audit, incremental safety) — Task 3 ✓
- Validation harness (frontmatter + src-ref integrity, run over all four) — Tasks 1–2 ✓
- Every skill references only real built modules (enforced by the test).
- **Deferred:** the screenshot/critique *capture harness* itself (Plan 05) — `audit` references it as "when a runnable app exists / manual until then."

**2. Placeholder scan:** No TBD/TODO; the validator + tests have complete code; each SKILL.md is authored in full. ✓

**3. Type consistency:** `validateSkillFile`/`ValidateOpts` (Task 1) consumed unchanged by the Task 2 test. Skill `src/...` references match real paths shipped in Plans 01–04 (`src/cli/tokens-codegen.ts`, `src/tokens/types.ts`, `src/variants/define-variants.ts`, `src/registry/build-registry.ts`, `src/registry/validate-tiers.ts`, `src/eslint/`, `src/eslint/index.ts`, `src/migrate/scan.ts`, `src/migrate/plan.ts`, `src/migrate/codemod.ts`). ✓
