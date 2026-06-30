# Huggable Plan 02 — Component-System Core (variants + registry + tier enforcement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the platform-neutral core that owned components stand on: a `defineVariants` engine (CVA-style variant resolution against design tokens, no Tailwind) and a component `registry` with mechanical tier-boundary enforcement (higher-order components may import only from strictly lower tiers).

**Architecture:** Pure, dependency-free TypeScript. `defineVariants(config)` returns a resolver `(selected) => mergedStyleProps` where style props are token-keyed objects an RN `Box`/`Text` (or a future web adapter) consumes. The `registry` is data describing each component's tier + dependencies; `validateTierBoundaries` turns the hierarchy rule into a checkable function (later consumed by the ESLint plugin in Plan 03). No React/React-Native imports — the actual RN component SOURCE is authored against a real Restyle theme during the track-stuff proof (Plan 07), where the screenshot-critique validates visuals.

**Tech Stack:** TypeScript (strict, ESM), Vitest. Same toolchain as Plan 01. No new runtime dependencies.

## Global Constraints

- Node ≥ 20; TypeScript `strict: true`; ESM with `.js` import specifiers in TS.
- NO React / React-Native imports in this plan — pure logic only.
- Style-prop objects are token-keyed records (e.g. `{ bg: "surface.card", px: "5", radius: "md" }`); values are token references, never raw values (the linter enforces raw-value bans separately in Plan 03).
- Tier order (low → high): `primitive` < `element` < `compound` < `pattern`. A component may depend only on STRICTLY lower tiers.
- Deterministic: resolver output for the same input is identical; merge order is base → variants (in config key order) → compound variants (in array order), later wins.

---

### Task 1: `defineVariants` — base + variants + defaultVariants

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/variants/types.ts`
- Create: `/Users/olliejarvis/Development/huggable/src/variants/define-variants.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/variants/define-variants.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts` exports `StyleProps = Record<string, string>`, `VariantGroups = Record<string, Record<string, StyleProps>>`, `VariantConfig`, `VariantSelection`.
  - `define-variants.ts` exports `defineVariants(config: VariantConfig): (selected?: VariantSelection) => StyleProps`.

- [ ] **Step 1: Write the failing test**

```ts
// test/variants/define-variants.test.ts
import { describe, it, expect } from "vitest";
import { defineVariants } from "../../src/variants/define-variants.js";

const button = defineVariants({
  base: { px: "5", py: "3", radius: "md" },
  variants: {
    tone: { primary: { bg: "accent.default" }, neutral: { bg: "surface.card" } },
    size: { sm: { px: "4", py: "2" }, md: { px: "5", py: "3" } },
  },
  defaultVariants: { tone: "primary", size: "md" },
});

describe("defineVariants (base + variants + defaults)", () => {
  it("applies base + default variants when nothing is selected", () => {
    expect(button()).toEqual({ px: "5", py: "3", radius: "md", bg: "accent.default" });
  });
  it("overrides defaults with selected variants (later wins)", () => {
    expect(button({ tone: "neutral", size: "sm" })).toEqual({
      px: "4", py: "2", radius: "md", bg: "surface.card",
    });
  });
  it("falls back to default for unspecified groups", () => {
    expect(button({ size: "sm" })).toEqual({ px: "4", py: "2", radius: "md", bg: "accent.default" });
  });
  it("ignores an unknown variant value (no throw, no style added)", () => {
    expect(button({ tone: "ghost" })).toEqual({ px: "5", py: "3", radius: "md" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/variants/define-variants.test.ts`
Expected: FAIL — cannot resolve `define-variants.js`.

- [ ] **Step 3: Implement the types**

```ts
// src/variants/types.ts
/** A style object whose values are either token KEYS (strings, e.g. bg: "surface.card",
 * px: "5") or raw pass-through values for non-tokenized props (numbers/booleans, e.g.
 * opacity: 0.5, flex: 1). The linter (Plan 03) distinguishes tokenized vs pass-through props. */
export type StyleProps = Record<string, string | number | boolean>;

/** variant group name -> variant value -> styles, e.g. { size: { sm: {...}, md: {...} } } */
export type VariantGroups = Record<string, Record<string, StyleProps>>;

export type VariantSelection = Record<string, string | boolean>;

export interface VariantConfig {
  base?: StyleProps;
  variants?: VariantGroups;
  defaultVariants?: Record<string, string | boolean>;
  /** each entry: variant conditions + the styles to apply when ALL match.
   * The index union includes StyleProps so the `style` key (StyleProps) doesn't
   * contradict the index; condition values are string|boolean at runtime. */
  compoundVariants?: Array<Record<string, string | boolean | StyleProps> & { style: StyleProps }>;
}
```

- [ ] **Step 4: Implement `defineVariants` (base + variants + defaults only for now)**

```ts
// src/variants/define-variants.ts
import type { VariantConfig, VariantSelection, StyleProps } from "./types.js";

export function defineVariants(config: VariantConfig): (selected?: VariantSelection) => StyleProps {
  const { base = {}, variants = {}, defaultVariants = {} } = config;

  return function resolve(selected: VariantSelection = {}): StyleProps {
    const props: StyleProps = { ...base };

    for (const group of Object.keys(variants)) {
      const chosen = selected[group] ?? defaultVariants[group];
      if (chosen === undefined) continue;
      const styles = variants[group]?.[String(chosen)];
      if (styles) Object.assign(props, styles);
    }

    return props;
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/variants/define-variants.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(variants): add defineVariants (base + variants + defaultVariants)"
```

---

### Task 2: `defineVariants` — compound + boolean variants

**Files:**
- Modify: `/Users/olliejarvis/Development/huggable/src/variants/define-variants.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/variants/define-variants-compound.test.ts`

**Interfaces:**
- Consumes: `VariantConfig` (already includes `compoundVariants`).
- Produces: same `defineVariants` signature; now also applies `compoundVariants` (after base+variants, in array order) and supports boolean variant values (selected `true`/`false` map to string keys `"true"`/`"false"`).

- [ ] **Step 1: Write the failing test**

```ts
// test/variants/define-variants-compound.test.ts
import { describe, it, expect } from "vitest";
import { defineVariants } from "../../src/variants/define-variants.js";

const chip = defineVariants({
  base: { radius: "full" },
  variants: {
    tone: { primary: { bg: "accent.default" }, neutral: { bg: "surface.card" } },
    disabled: { true: { bg: "bg.subtle" }, false: {} },
  },
  defaultVariants: { tone: "primary", disabled: false },
  compoundVariants: [
    { tone: "primary", disabled: true, style: { bg: "border.subtle", opacity: 0.5 } },
  ],
});

describe("defineVariants (compound + boolean)", () => {
  it("handles boolean variants via true/false keys", () => {
    expect(chip({ disabled: true })).toEqual({
      radius: "full",
      bg: "border.subtle", // compound override wins over the disabled=true variant
      opacity: 0.5,
    });
  });
  it("does not apply a compound variant when conditions do not all match", () => {
    expect(chip({ tone: "neutral", disabled: true })).toEqual({ radius: "full", bg: "bg.subtle" });
  });
  it("applies compound variants after base+variants (array order, later wins)", () => {
    const x = defineVariants({
      base: {},
      variants: { a: { on: { color: "x" } } },
      defaultVariants: { a: "on" },
      compoundVariants: [
        { a: "on", style: { color: "y" } },
        { a: "on", style: { color: "z" } },
      ],
    });
    expect(x()).toEqual({ color: "z" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/variants/define-variants-compound.test.ts`
Expected: FAIL — compound variants not applied; `chip({disabled:true})` lacks the compound override.

- [ ] **Step 3: Extend the implementation**

Replace the body of `resolve` in `src/variants/define-variants.ts` so the function reads:

```ts
// src/variants/define-variants.ts
import type { VariantConfig, VariantSelection, StyleProps } from "./types.js";

export function defineVariants(config: VariantConfig): (selected?: VariantSelection) => StyleProps {
  const { base = {}, variants = {}, defaultVariants = {}, compoundVariants = [] } = config;

  return function resolve(selected: VariantSelection = {}): StyleProps {
    const props: StyleProps = { ...base };

    // resolve each group's effective value (selected or default)
    const effective: Record<string, string> = {};
    for (const group of Object.keys(variants)) {
      const chosen = selected[group] ?? defaultVariants[group];
      if (chosen === undefined) continue;
      effective[group] = String(chosen);
      const styles = variants[group]?.[effective[group]];
      if (styles) Object.assign(props, styles);
    }

    // apply compound variants whose every condition matches the effective values
    for (const compound of compoundVariants) {
      const { style, ...conditions } = compound;
      const matches = Object.entries(conditions).every(
        ([group, value]) => effective[group] === String(value),
      );
      if (matches) Object.assign(props, style);
    }

    return props;
  };
}
```

- [ ] **Step 4: Run both variant test files to verify they pass**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/variants/`
Expected: PASS (Task 1's 4 tests + Task 2's 3 tests = 7).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(variants): support compound variants and boolean variant values"
```

---

### Task 3: Registry — types + `buildRegistry`

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/registry/types.ts`
- Create: `/Users/olliejarvis/Development/huggable/src/registry/build-registry.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/registry/build-registry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts` exports `Tier` (`"primitive" | "element" | "compound" | "pattern"`), `TIER_ORDER: Tier[]`, `ComponentMeta`, `Registry`.
  - `build-registry.ts` exports `buildRegistry(components: ComponentMeta[]): Registry` (throws on duplicate names).

- [ ] **Step 1: Write the failing test**

```ts
// test/registry/build-registry.test.ts
import { describe, it, expect } from "vitest";
import { buildRegistry } from "../../src/registry/build-registry.js";
import type { ComponentMeta } from "../../src/registry/types.js";

const comps: ComponentMeta[] = [
  { name: "Box", tier: "primitive", dependsOn: [] },
  { name: "Button", tier: "element", dependsOn: ["Box", "Text"] },
  { name: "Text", tier: "primitive", dependsOn: [] },
];

describe("buildRegistry", () => {
  it("indexes components by name", () => {
    const reg = buildRegistry(comps);
    expect(Object.keys(reg.components).sort()).toEqual(["Box", "Button", "Text"]);
    expect(reg.components.Button.dependsOn).toEqual(["Box", "Text"]);
  });
  it("throws on a duplicate component name", () => {
    expect(() => buildRegistry([...comps, { name: "Box", tier: "primitive", dependsOn: [] }])).toThrow(
      /duplicate component "Box"/i,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/registry/build-registry.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the types**

```ts
// src/registry/types.ts
export type Tier = "primitive" | "element" | "compound" | "pattern";

/** low -> high; index = rank. A component may depend only on strictly lower ranks. */
export const TIER_ORDER: Tier[] = ["primitive", "element", "compound", "pattern"];

export interface ComponentMeta {
  name: string;
  tier: Tier;
  /** names of other registered components this one imports/composes */
  dependsOn: string[];
  /** optional: variant group names this component exposes */
  variants?: string[];
}

export interface Registry {
  components: Record<string, ComponentMeta>;
}
```

- [ ] **Step 4: Implement `buildRegistry`**

```ts
// src/registry/build-registry.ts
import type { ComponentMeta, Registry } from "./types.js";

export function buildRegistry(components: ComponentMeta[]): Registry {
  // prototype-less map: avoids "constructor"/"toString" key hazards in both the
  // duplicate guard here and reg.components[depName] lookups in validateTierBoundaries.
  const map: Record<string, ComponentMeta> = Object.create(null);
  for (const c of components) {
    if (map[c.name]) throw new Error(`duplicate component "${c.name}" in registry`);
    map[c.name] = c;
  }
  return { components: map };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/registry/build-registry.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(registry): add registry types + buildRegistry"
```

---

### Task 4: `validateTierBoundaries` — mechanical hierarchy enforcement

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/registry/validate-tiers.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/registry/validate-tiers.test.ts`

**Interfaces:**
- Consumes: `Registry`, `Tier`, `TIER_ORDER` from `src/registry/types.ts`.
- Produces: `validateTierBoundaries(reg: Registry): string[]` — returns an array of human-readable violation messages (empty = all imports point to strictly lower tiers). Also reports a dependency on an unknown component. (Consumed by the ESLint plugin in Plan 03.)

- [ ] **Step 1: Write the failing test**

```ts
// test/registry/validate-tiers.test.ts
import { describe, it, expect } from "vitest";
import { buildRegistry } from "../../src/registry/build-registry.js";
import { validateTierBoundaries } from "../../src/registry/validate-tiers.js";

describe("validateTierBoundaries", () => {
  it("passes when every dependency is a strictly lower tier", () => {
    const reg = buildRegistry([
      { name: "Box", tier: "primitive", dependsOn: [] },
      { name: "Text", tier: "primitive", dependsOn: [] },
      { name: "Button", tier: "element", dependsOn: ["Box", "Text"] },
      { name: "Card", tier: "compound", dependsOn: ["Box", "Button"] },
    ]);
    expect(validateTierBoundaries(reg)).toEqual([]);
  });

  it("flags a same-tier dependency", () => {
    const reg = buildRegistry([
      { name: "Button", tier: "element", dependsOn: ["Badge"] },
      { name: "Badge", tier: "element", dependsOn: [] },
    ]);
    const errors = validateTierBoundaries(reg);
    expect(errors.some((e) => /Button \(element\).*Badge \(element\).*strictly lower/i.test(e))).toBe(true);
  });

  it("flags a higher-tier dependency (inversion)", () => {
    const reg = buildRegistry([
      { name: "Box", tier: "primitive", dependsOn: ["Card"] },
      { name: "Card", tier: "compound", dependsOn: [] },
    ]);
    expect(validateTierBoundaries(reg).some((e) => /Box \(primitive\).*Card \(compound\)/i.test(e))).toBe(true);
  });

  it("flags a dependency on an unknown component", () => {
    const reg = buildRegistry([{ name: "Button", tier: "element", dependsOn: ["Ghost"] }]);
    expect(validateTierBoundaries(reg).some((e) => /unknown component "Ghost"/i.test(e))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/registry/validate-tiers.test.ts`
Expected: FAIL — `validate-tiers.js` not found.

- [ ] **Step 3: Implement `validateTierBoundaries`**

```ts
// src/registry/validate-tiers.ts
import type { Registry, Tier } from "./types.js";
import { TIER_ORDER } from "./types.js";

const rank = (t: Tier): number => TIER_ORDER.indexOf(t);

export function validateTierBoundaries(reg: Registry): string[] {
  const errors: string[] = [];
  for (const component of Object.values(reg.components)) {
    for (const depName of component.dependsOn) {
      const dep = reg.components[depName];
      if (!dep) {
        errors.push(`${component.name} (${component.tier}) depends on unknown component "${depName}"`);
        continue;
      }
      if (rank(dep.tier) >= rank(component.tier)) {
        errors.push(
          `${component.name} (${component.tier}) imports ${dep.name} (${dep.tier}) — components may only import from strictly lower tiers`,
        );
      }
    }
  }
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/registry/validate-tiers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run full suite + typecheck**

Run: `cd /Users/olliejarvis/Development/huggable && npm test && npm run typecheck`
Expected: all tests pass (Plan 01's 24 + this plan's 13 = 37); `tsc --noEmit` exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(registry): add validateTierBoundaries (hierarchy enforcement)"
```

---

## Self-Review

**1. Spec coverage (this plan = the platform-neutral component-system core):**
- `defineVariants` CVA-on-non-Tailwind engine (base/variants/defaults/compound/boolean) — Tasks 1–2 ✓
- Component registry (the manifest of tier + dependencies) — Task 3 ✓
- Mechanical tier-boundary enforcement ("higher-order components import only from strictly lower tiers") — Task 4 ✓ (function form; the ESLint rule wrapping it is Plan 03)
- **Deliberately deferred:** actual RN component SOURCE (Box/Text/Button) → authored against a real Restyle theme during the track-stuff proof (Plan 07), where screenshot-critique validates visuals. Web carry-overs (StyleX radius/text, shared key helper) → web phase (v0.2).

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; every test step has a command + expected result. ✓

**3. Type consistency:** `StyleProps`/`VariantGroups`/`VariantConfig`/`VariantSelection` defined in Task 1 `types.ts` and used unchanged in Task 2. `Tier`/`TIER_ORDER`/`ComponentMeta`/`Registry` defined in Task 3 and consumed identically by Task 4. `defineVariants`, `buildRegistry`, `validateTierBoundaries` signatures match between defining task and tests. ✓
