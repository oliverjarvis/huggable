# Huggable Plan 04 — Migration Engine Core (ts-morph) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the testable core of the migration engine: scan source for off-system style values, reconcile them to tokens with a hybrid snap policy (auto-snap within tolerance, flag outliers), produce a reviewable migration plan, and apply the mapping back to source via ts-morph codemods.

**Architecture:** Pure functions where possible; ts-morph only for AST parsing/rewriting. Four units: `scanStyleValues` (inventory raw colors + magic numbers from `.tsx` source), `snapNumber`/`snapColor` (hybrid reconciliation against a token scale), `buildMigrationPlan` (scan + snap → `{ mappings, flagged }`), `applyTokenCodemod` (rewrite raw style values to token references per a mapping). The full per-app orchestration + component extraction + visual regression run against the real app in Plan 07; this plan delivers the reusable, fixture-tested engine.

**Tech Stack:** TypeScript (strict, ESM), Vitest, ts-morph (in-memory AST). Same repo/toolchain as Plans 01–03. Adds `ts-morph` as a dependency.

## Global Constraints

- Node ≥ 20; TypeScript `strict: true`; ESM with `.js` import specifiers in TS.
- ts-morph parses in-memory (`useInMemoryFileSystem: true`); no real filesystem writes in the pure functions/tests.
- Hybrid snap: a value within tolerance of a token snaps to that token; outside tolerance it is flagged (never silently changed). Default tolerances: spacing ±2 (px); color RGB Euclidean distance ≤ 12.
- `0` is never flagged as a magic number.
- Numeric findings are scoped to known style props (a built-in list, overridable); color findings apply to any hex/`rgb()/hsl()` string literal (colors are unambiguous).
- Codemods are deterministic and idempotent (re-running on already-migrated source is a no-op).

---

### Task 1: `scanStyleValues` — inventory off-system values

**Files:**
- Modify: `/Users/olliejarvis/Development/huggable/package.json` (add `ts-morph` dependency)
- Create: `/Users/olliejarvis/Development/huggable/src/migrate/style-props.ts`
- Create: `/Users/olliejarvis/Development/huggable/src/migrate/scan.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/migrate/scan.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `style-props.ts` exports `STYLE_NUMBER_PROPS: Set<string>` (spacing/radius/layout props).
  - `scan.ts` exports `StyleFinding` (`{ prop, raw, kind: "color" | "number", line }`) and `scanStyleValues(sourceText: string, opts?: { numberProps?: Set<string> }): StyleFinding[]`.

- [ ] **Step 1: Add the ts-morph dependency**

Add `"ts-morph": "^24.0.0"` to `dependencies` (NOT devDependencies — it's used by the migration runtime) in `package.json`. Then:

Run: `cd /Users/olliejarvis/Development/huggable && npm install`
Expected: installs ts-morph; no errors.

- [ ] **Step 2: Write the failing test**

```ts
// test/migrate/scan.test.ts
import { describe, it, expect } from "vitest";
import { scanStyleValues } from "../../src/migrate/scan.js";

const SRC = `
function Card() {
  const s = { padding: 13, marginTop: 16, backgroundColor: "#FBF9F4", zIndex: 5 };
  return <View style={{ padding: 8, borderColor: "#10100F" }} count={42} />;
}
`;

describe("scanStyleValues", () => {
  it("finds hex colors anywhere", () => {
    const colors = scanStyleValues(SRC).filter((f) => f.kind === "color").map((f) => f.raw);
    expect(colors).toEqual(expect.arrayContaining(["#FBF9F4", "#10100F"]));
  });
  it("finds magic numbers only on style props (not on count=42)", () => {
    const nums = scanStyleValues(SRC).filter((f) => f.kind === "number");
    const props = nums.map((f) => f.prop);
    expect(props).toEqual(expect.arrayContaining(["padding", "marginTop"]));
    expect(props).not.toContain("count");
    expect(props).not.toContain("zIndex"); // not in the default style-number props
  });
  it("does not flag 0", () => {
    const nums = scanStyleValues(`const s = { padding: 0 };`).filter((f) => f.kind === "number");
    expect(nums).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/scan.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the style-prop list**

```ts
// src/migrate/style-props.ts
export const STYLE_NUMBER_PROPS = new Set<string>([
  "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "paddingHorizontal", "paddingVertical",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical",
  "gap", "rowGap", "columnGap", "borderRadius", "borderWidth", "top", "bottom", "left", "right", "width", "height",
]);
```

- [ ] **Step 5: Implement the scanner**

```ts
// src/migrate/scan.ts
import { Project, Node, SyntaxKind } from "ts-morph";
import { STYLE_NUMBER_PROPS } from "./style-props.js";

export interface StyleFinding {
  prop: string;
  raw: string | number;
  kind: "color" | "number";
  line: number;
}

const COLOR = /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgb|rgba|hsl|hsla)\([^)]*\))$/;

/** Numeric value of a NumericLiteral OR a unary +/- numeric literal — so negative
 * style values like `margin: -8` are captured (they parse as PrefixUnaryExpression). */
export function numericValueOf(node: Node): number | null {
  if (Node.isNumericLiteral(node)) return node.getLiteralValue();
  if (Node.isPrefixUnaryExpression(node)) {
    const op = node.getOperatorToken();
    const operand = node.getOperand();
    if (Node.isNumericLiteral(operand) && (op === SyntaxKind.MinusToken || op === SyntaxKind.PlusToken)) {
      const v = operand.getLiteralValue();
      return op === SyntaxKind.MinusToken ? -v : v;
    }
  }
  return null;
}

export function scanStyleValues(sourceText: string, opts: { numberProps?: Set<string> } = {}): StyleFinding[] {
  const numberProps = opts.numberProps ?? STYLE_NUMBER_PROPS;
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile("scan.tsx", sourceText, { overwrite: true });
  const findings: StyleFinding[] = [];

  sf.forEachDescendant((node) => {
    if (!Node.isPropertyAssignment(node)) return;
    const name = node.getName().replace(/^["']|["']$/g, "");
    const init = node.getInitializer();
    if (!init) return;
    const line = node.getStartLineNumber();

    if (Node.isStringLiteral(init)) {
      const value = init.getLiteralValue();
      if (COLOR.test(value.trim())) findings.push({ prop: name, raw: value, kind: "color", line });
      return;
    }
    const num = numericValueOf(init);
    if (num !== null && num !== 0 && numberProps.has(name)) {
      findings.push({ prop: name, raw: num, kind: "number", line });
    }
  });

  return findings;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/scan.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(migrate): add scanStyleValues (ts-morph inventory of off-system values)"
```

---

### Task 2: `snapNumber` + `snapColor` — hybrid reconciliation

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/migrate/snap.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/migrate/snap.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SnapResult` = `{ status: "snapped"; token: string; distance: number } | { status: "flagged"; nearest: string; distance: number }`.
  - `snapNumber(value: number, scale: Record<string, number>, tolerance?: number): SnapResult` (default tolerance 2).
  - `snapColor(hex: string, palette: Record<string, string>, tolerance?: number): SnapResult` (default tolerance 12; RGB Euclidean). Non-hex input (e.g. `rgb(...)`) is always `flagged` with `nearest: ""`, `distance: Infinity`.

- [ ] **Step 1: Write the failing test**

```ts
// test/migrate/snap.test.ts
import { describe, it, expect } from "vitest";
import { snapNumber, snapColor } from "../../src/migrate/snap.js";

const SPACE = { "0": 0, "3": 8, "4": 12, "5": 16, "6": 24 };
const PALETTE = { paper50: "#FBF9F4", ink900: "#10100F", clay500: "#C2410C" };

describe("snapNumber", () => {
  it("snaps within tolerance to the nearest token", () => {
    expect(snapNumber(13, SPACE)).toEqual({ status: "snapped", token: "4", distance: 1 });
  });
  it("snaps exact matches with distance 0", () => {
    expect(snapNumber(16, SPACE)).toEqual({ status: "snapped", token: "5", distance: 0 });
  });
  it("flags values outside tolerance", () => {
    expect(snapNumber(20, SPACE)).toEqual({ status: "flagged", nearest: "6", distance: 4 });
  });
});

describe("snapColor", () => {
  it("snaps a near-identical hex within tolerance", () => {
    expect(snapColor("#FBF9F5", PALETTE)).toMatchObject({ status: "snapped", token: "paper50" });
  });
  it("flags a color far from any token", () => {
    expect(snapColor("#00FF00", PALETTE)).toMatchObject({ status: "flagged" });
  });
  it("flags non-hex color functions", () => {
    expect(snapColor("rgb(0,0,0)", PALETTE)).toEqual({ status: "flagged", nearest: "", distance: Infinity });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/snap.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the snappers**

```ts
// src/migrate/snap.ts
export type SnapResult =
  | { status: "snapped"; token: string; distance: number }
  | { status: "flagged"; nearest: string; distance: number };

export function snapNumber(value: number, scale: Record<string, number>, tolerance = 2): SnapResult {
  let best = "";
  let bestDist = Infinity;
  for (const [token, v] of Object.entries(scale)) {
    const d = Math.abs(v - value);
    if (d <= bestDist) { // <= : on an exact tie, the later token in iteration order wins
      bestDist = d;
      best = token;
    }
  }
  return bestDist <= tolerance
    ? { status: "snapped", token: best, distance: bestDist }
    : { status: "flagged", nearest: best, distance: bestDist };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) {
    const short = /^#([0-9a-fA-F]{3})$/.exec(hex.trim());
    if (!short) return null;
    const [r, g, b] = short[1].split("");
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  const n = m[1];
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export function snapColor(hex: string, palette: Record<string, string>, tolerance = 12): SnapResult {
  const rgb = hexToRgb(hex);
  if (!rgb) return { status: "flagged", nearest: "", distance: Infinity };
  let best = "";
  let bestDist = Infinity;
  for (const [token, value] of Object.entries(palette)) {
    const prgb = hexToRgb(value);
    if (!prgb) continue;
    const d = Math.sqrt((rgb[0] - prgb[0]) ** 2 + (rgb[1] - prgb[1]) ** 2 + (rgb[2] - prgb[2]) ** 2);
    if (d <= bestDist) { // <= : on an exact tie, the later token in iteration order wins
      bestDist = d;
      best = token;
    }
  }
  return bestDist <= tolerance
    ? { status: "snapped", token: best, distance: bestDist }
    : { status: "flagged", nearest: best, distance: bestDist };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/snap.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(migrate): add snapNumber + snapColor (hybrid reconciliation)"
```

---

### Task 3: `buildMigrationPlan` — scan + reconcile into a reviewable report

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/migrate/plan.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/migrate/plan.test.ts`

**Interfaces:**
- Consumes: `scanStyleValues`, `StyleFinding`, `snapNumber`, `snapColor`, `SnapResult`.
- Produces:
  - `MigrationPlan` = `{ mappings: Mapping[]; flagged: Flagged[] }` where `Mapping = { prop; raw; kind; line; token }` and `Flagged = { prop; raw; kind; line; nearest; distance }`.
  - `buildMigrationPlan(sourceText: string, tokens: { space: Record<string, number>; palette: Record<string, string> }): MigrationPlan`.

- [ ] **Step 1: Write the failing test**

```ts
// test/migrate/plan.test.ts
import { describe, it, expect } from "vitest";
import { buildMigrationPlan } from "../../src/migrate/plan.js";

const TOKENS = {
  space: { "0": 0, "3": 8, "4": 12, "5": 16, "6": 24 },
  palette: { paper50: "#FBF9F4", ink900: "#10100F" },
};
const SRC = `const s = { padding: 13, marginTop: 20, backgroundColor: "#FBF9F5", borderColor: "#00FF00" };`;

describe("buildMigrationPlan", () => {
  const plan = buildMigrationPlan(SRC, TOKENS);
  it("maps in-tolerance values to tokens", () => {
    expect(plan.mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ prop: "padding", raw: 13, token: "4" }),
        expect.objectContaining({ prop: "backgroundColor", raw: "#FBF9F5", token: "paper50" }),
      ]),
    );
  });
  it("flags out-of-tolerance values instead of mapping them", () => {
    const flaggedProps = plan.flagged.map((f) => f.prop);
    expect(flaggedProps).toEqual(expect.arrayContaining(["marginTop", "borderColor"]));
    expect(plan.mappings.map((m) => m.prop)).not.toContain("marginTop");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/plan.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the planner**

```ts
// src/migrate/plan.ts
import { scanStyleValues } from "./scan.js";
import { snapNumber, snapColor } from "./snap.js";

export interface Mapping {
  prop: string;
  raw: string | number;
  kind: "color" | "number";
  line: number;
  token: string;
}
export interface Flagged {
  prop: string;
  raw: string | number;
  kind: "color" | "number";
  line: number;
  nearest: string;
  distance: number;
}
export interface MigrationPlan {
  mappings: Mapping[];
  flagged: Flagged[];
}

export function buildMigrationPlan(
  sourceText: string,
  tokens: { space: Record<string, number>; palette: Record<string, string> },
): MigrationPlan {
  const mappings: Mapping[] = [];
  const flagged: Flagged[] = [];

  for (const finding of scanStyleValues(sourceText)) {
    const result =
      finding.kind === "number"
        ? snapNumber(finding.raw as number, tokens.space)
        : snapColor(finding.raw as string, tokens.palette);

    if (result.status === "snapped") {
      mappings.push({ prop: finding.prop, raw: finding.raw, kind: finding.kind, line: finding.line, token: result.token });
    } else {
      flagged.push({
        prop: finding.prop,
        raw: finding.raw,
        kind: finding.kind,
        line: finding.line,
        nearest: result.nearest,
        distance: result.distance,
      });
    }
  }

  return { mappings, flagged };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/plan.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(migrate): add buildMigrationPlan (scan + reconcile -> mappings/flagged)"
```

---

### Task 4: `applyTokenCodemod` — rewrite raw style values to token references

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/migrate/codemod.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/migrate/codemod.test.ts`

**Interfaces:**
- Consumes: `Mapping` from `src/migrate/plan.ts`; ts-morph.
- Produces: `applyTokenCodemod(sourceText: string, mappings: Mapping[], opts?: { spaceExpr?: (token: string) => string; colorExpr?: (token: string) => string }): string`. Rewrites each numeric/color literal at the mapped `(prop, raw)` site to a token reference. Defaults: number → `theme.spacing["<token>"]`, color → `theme.colors["<token>"]`. Idempotent: a value already written as a token expression is not a literal, so re-running is a no-op.

- [ ] **Step 1: Write the failing test**

```ts
// test/migrate/codemod.test.ts
import { describe, it, expect } from "vitest";
import { applyTokenCodemod } from "../../src/migrate/codemod.js";
import type { Mapping } from "../../src/migrate/plan.js";

const SRC = `const s = { padding: 13, backgroundColor: "#FBF9F5", zIndex: 5 };`;
const MAPPINGS: Mapping[] = [
  { prop: "padding", raw: 13, kind: "number", line: 1, token: "4" },
  { prop: "backgroundColor", raw: "#FBF9F5", kind: "color", line: 1, token: "paper50" },
];

describe("applyTokenCodemod", () => {
  it("rewrites mapped literals to token references and leaves others alone", () => {
    const out = applyTokenCodemod(SRC, MAPPINGS);
    expect(out).toContain(`padding: theme.spacing["4"]`);
    expect(out).toContain(`backgroundColor: theme.colors["paper50"]`);
    expect(out).toContain(`zIndex: 5`); // untouched (not in mappings)
  });
  it("is idempotent (re-running on migrated output changes nothing)", () => {
    const once = applyTokenCodemod(SRC, MAPPINGS);
    expect(applyTokenCodemod(once, MAPPINGS)).toBe(once);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/codemod.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the codemod**

```ts
// src/migrate/codemod.ts
import { Project, Node } from "ts-morph";
import { numericValueOf } from "./scan.js";
import type { Mapping } from "./plan.js";

export function applyTokenCodemod(
  sourceText: string,
  mappings: Mapping[],
  opts: { spaceExpr?: (token: string) => string; colorExpr?: (token: string) => string } = {},
): string {
  const spaceExpr = opts.spaceExpr ?? ((t) => `theme.spacing["${t}"]`);
  const colorExpr = opts.colorExpr ?? ((t) => `theme.colors["${t}"]`);

  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile("codemod.tsx", sourceText, { overwrite: true });

  // index mappings by prop + raw for O(1) lookup
  const byKey = new Map<string, Mapping>();
  for (const m of mappings) byKey.set(`${m.prop}::${String(m.raw)}`, m);

  sf.forEachDescendant((node) => {
    if (!Node.isPropertyAssignment(node)) return;
    const name = node.getName().replace(/^["']|["']$/g, "");
    const init = node.getInitializer();
    if (!init) return;

    let raw: string | null = null;
    const num = numericValueOf(init);
    if (num !== null) raw = String(num);
    else if (Node.isStringLiteral(init)) raw = init.getLiteralValue();
    if (raw === null) return;

    const mapping = byKey.get(`${name}::${raw}`);
    if (!mapping) return;
    init.replaceWithText(mapping.kind === "number" ? spaceExpr(mapping.token) : colorExpr(mapping.token));
  });

  return sf.getFullText();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/migrate/codemod.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run full suite + typecheck**

Run: `cd /Users/olliejarvis/Development/huggable && npm test && npm run typecheck`
Expected: all tests pass (Plans 01–03's 75 + this plan's cases); `tsc --noEmit` exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(migrate): add applyTokenCodemod (rewrite raw style values to token refs)"
```

---

## Self-Review

**1. Spec coverage (this plan = the testable migration-engine core; §8 phases 1–3):**
- Audit/discover off-system values — Task 1 (`scanStyleValues`) ✓
- Token reconciliation with hybrid snap (auto-snap in tolerance, flag outliers) — Task 2 (`snapNumber`/`snapColor`) + Task 3 (`buildMigrationPlan`) ✓
- Codemod rewrite to tokens, deterministic + idempotent — Task 4 (`applyTokenCodemod`) ✓
- **Deferred to Plan 07 (real app):** NativeWind `className` → Box-prop transform, component discovery/extraction (repeated JSX → owned components), lint-to-green loop, before/after visual regression, and the per-app orchestration/CLI. These need a real codebase (track-stuff) + the component model, so they run where they can be validated end-to-end.

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; every test step has a command + expected result. ✓

**3. Type consistency:** `StyleFinding` (Task 1) consumed by Task 3; `SnapResult` (Task 2) consumed by Task 3; `Mapping`/`MigrationPlan` (Task 3) consumed by Task 4. `scanStyleValues`, `snapNumber`, `snapColor`, `buildMigrationPlan`, `applyTokenCodemod` signatures match between defining task and consumers/tests. ✓
