# Huggable Plan 03 — eslint-plugin-huggable (off-system-value enforcement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic enforcement floor: an ESLint plugin whose rules flag off-system values (raw colors, banned fonts, magic numbers in style-prop positions) in StyleX/Restyle code, each respecting a `// huggable-allow: <reason>` escape hatch.

**Architecture:** Standard ESLint 9 flat-config plugin. Each rule is a parser-agnostic AST visitor (works under espree-with-jsx in tests and `@typescript-eslint/parser` in a real TS app). A shared `hasAllowComment` helper implements the escape hatch. Rules are unit-tested with ESLint's `RuleTester` running inside Vitest (no separate test runner). The plugin exports `rules` + a `configs.recommended` flat config.

**Tech Stack:** TypeScript (strict, ESM), Vitest, ESLint 9 (`RuleTester`). Same repo/toolchain as Plans 01–02. Adds `eslint` as a devDependency.

## Global Constraints

- Node ≥ 20; TypeScript `strict: true`; ESM with `.js` import specifiers in TS.
- ESLint 9 flat config. Rules expose `meta` (with `messages` + `schema`) and `create(context)`; report via `messageId`.
- Banned font families (case-insensitive): `Inter`, `Roboto`, `Arial`, `Open Sans`, `Lato`, `Fraunces`.
- Every rule honors a `// huggable-allow: <reason>` comment on the same line as, or the line directly above, the offending node — when present, the rule does not report that node.
- `0` is an allowed numeric value for spacing/layout props (not flagged by `no-magic-number`).
- `RuleTester` is configured with `languageOptions.parserOptions.ecmaFeatures.jsx: true` so JSX test fixtures parse under espree. Tests use plain JS/JSX source strings (no TS types needed in fixtures). Call `ruleTester.run(...)` at the top level of each test file (it registers Vitest `describe`/`it` itself).

---

### Task 1: Scaffold the plugin + escape-hatch helper + first rule (`no-banned-fonts`)

**Files:**
- Modify: `/Users/olliejarvis/Development/huggable/package.json` (add `eslint` devDependency)
- Create: `/Users/olliejarvis/Development/huggable/src/eslint/allow-comment.ts`
- Create: `/Users/olliejarvis/Development/huggable/src/eslint/rules/no-banned-fonts.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/eslint/no-banned-fonts.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `allow-comment.ts` exports `hasAllowComment(node, sourceCode): boolean`.
  - `no-banned-fonts.ts` exports `noBannedFonts` (an ESLint rule object).
  - Proves the RuleTester-in-Vitest harness end-to-end (incl. the escape hatch).

- [ ] **Step 1: Add the eslint devDependency**

Add `"eslint": "^9.13.0"` to `devDependencies` in `package.json` (keep existing entries; alphabetical-ish). Then run:

Run: `cd /Users/olliejarvis/Development/huggable && npm install`
Expected: installs eslint; no errors.

- [ ] **Step 2: Write the failing test**

```ts
// test/eslint/no-banned-fonts.test.ts
import { RuleTester } from "eslint";
import { noBannedFonts } from "../../src/eslint/rules/no-banned-fonts.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run("no-banned-fonts", noBannedFonts, {
  valid: [
    { code: `const f = "Clash Display";` },
    { code: `const f = "Geist Mono";` },
    { code: `const f = "Inter"; // huggable-allow: legacy screen` },
    { code: `// huggable-allow: migration\nconst f = "Roboto";` },
  ],
  invalid: [
    { code: `const f = "Inter";`, errors: [{ messageId: "banned" }] },
    { code: `const f = "roboto";`, errors: [{ messageId: "banned" }] },
    { code: `const f = "OPEN SANS";`, errors: [{ messageId: "banned" }] },
    { code: `<Text style={{ fontFamily: "Fraunces" }} />;`, errors: [{ messageId: "banned" }] },
  ],
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/no-banned-fonts.test.ts`
Expected: FAIL — cannot resolve `no-banned-fonts.js`.

- [ ] **Step 4: Implement the escape-hatch helper**

```ts
// src/eslint/allow-comment.ts
import type { Rule } from "eslint";
import type { Node } from "estree";

/** True if a `// huggable-allow` comment sits on the node's line or the line directly above it. */
export function hasAllowComment(node: Node, sourceCode: Rule.RuleContext["sourceCode"]): boolean {
  if (!node.loc) return false;
  const line = node.loc.start.line;
  return sourceCode.getAllComments().some((comment) => {
    if (!comment.loc) return false;
    const onSameOrPrevLine = comment.loc.end.line === line || comment.loc.end.line === line - 1;
    return onSameOrPrevLine && /huggable-allow/.test(comment.value);
  });
}
```

- [ ] **Step 5: Implement the rule**

```ts
// src/eslint/rules/no-banned-fonts.ts
import type { Rule } from "eslint";
import type { Literal } from "estree";
import { hasAllowComment } from "../allow-comment.js";

const BANNED = new Set(["inter", "roboto", "arial", "open sans", "lato", "fraunces"]);

export const noBannedFonts: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow generic/overused font families; choose a distinctive typeface." },
    messages: {
      banned: 'Banned font "{{name}}" — choose a distinctive typeface, or annotate with // huggable-allow: <reason>.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Literal(node: Literal) {
        if (typeof node.value !== "string") return;
        if (!BANNED.has(node.value.trim().toLowerCase())) return;
        if (hasAllowComment(node, sourceCode)) return;
        context.report({ node, messageId: "banned", data: { name: node.value } });
      },
    };
  },
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/no-banned-fonts.test.ts`
Expected: PASS (4 valid + 4 invalid cases, registered by RuleTester).

- [ ] **Step 7: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(eslint): scaffold plugin + hasAllowComment helper + no-banned-fonts rule"
```

---

### Task 2: `no-raw-color` rule

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/eslint/rules/no-raw-color.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/eslint/no-raw-color.test.ts`

**Interfaces:**
- Consumes: `hasAllowComment` from `src/eslint/allow-comment.ts`.
- Produces: `noRawColor` (ESLint rule) — flags string literals that are hex colors (`#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa`) or `rgb()/rgba()/hsl()/hsla()` color functions.

- [ ] **Step 1: Write the failing test**

```ts
// test/eslint/no-raw-color.test.ts
import { RuleTester } from "eslint";
import { noRawColor } from "../../src/eslint/rules/no-raw-color.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run("no-raw-color", noRawColor, {
  valid: [
    { code: `const c = "surface.card";` },
    { code: `const c = "accent.default";` },
    { code: `const c = "#fff"; // huggable-allow: brand asset` },
    { code: `const n = "#notacolor";` },
  ],
  invalid: [
    { code: `const c = "#fff";`, errors: [{ messageId: "rawColor" }] },
    { code: `const c = "#FBF9F4";`, errors: [{ messageId: "rawColor" }] },
    { code: `const c = "#10100Fff";`, errors: [{ messageId: "rawColor" }] },
    { code: `const c = "rgba(0,0,0,0.5)";`, errors: [{ messageId: "rawColor" }] },
    { code: `<Box style={{ backgroundColor: "#000" }} />;`, errors: [{ messageId: "rawColor" }] },
  ],
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/no-raw-color.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the rule**

```ts
// src/eslint/rules/no-raw-color.ts
import type { Rule } from "eslint";
import type { Literal } from "estree";
import { hasAllowComment } from "../allow-comment.js";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC = /^(?:rgb|rgba|hsl|hsla)\(/i;

function isRawColor(value: string): boolean {
  const v = value.trim();
  return HEX.test(v) || FUNC.test(v);
}

export const noRawColor: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw color literals; reference a design token instead." },
    messages: {
      rawColor: 'Raw color "{{value}}" — use a design token, or annotate with // huggable-allow: <reason>.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Literal(node: Literal) {
        if (typeof node.value !== "string") return;
        if (!isRawColor(node.value)) return;
        if (hasAllowComment(node, sourceCode)) return;
        context.report({ node, messageId: "rawColor", data: { value: node.value } });
      },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/no-raw-color.test.ts`
Expected: PASS (4 valid + 5 invalid).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(eslint): add no-raw-color rule (hex + rgb/hsl functions)"
```

---

### Task 3: `no-magic-number` rule

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/eslint/rules/no-magic-number.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/eslint/no-magic-number.test.ts`

**Interfaces:**
- Consumes: `hasAllowComment`.
- Produces: `noMagicNumber` (ESLint rule) — flags numeric literals assigned to a configured set of tokenized style props, in object properties (`{ padding: 13 }`) and JSX attributes (`<Box p={13} />`). `0` is allowed. The prop set is configurable via `options[0].props` (string[]); a sane default list is built in.

- [ ] **Step 1: Write the failing test**

```ts
// test/eslint/no-magic-number.test.ts
import { RuleTester } from "eslint";
import { noMagicNumber } from "../../src/eslint/rules/no-magic-number.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run("no-magic-number", noMagicNumber, {
  valid: [
    { code: `const s = { padding: 0 };` }, // 0 allowed
    { code: `const s = { padding: "4" };` }, // token key, not a number
    { code: `<Box p="5" />;` }, // token key string
    { code: `const s = { zoom: 13 };` }, // not a tokenized prop
    { code: `const s = { padding: 13 }; // huggable-allow: third-party widget` },
    { code: `<Box p={16} /* huggable-allow: temp */ />;` },
  ],
  invalid: [
    { code: `const s = { padding: 13 };`, errors: [{ messageId: "magic" }] },
    { code: `const s = { marginTop: 16 };`, errors: [{ messageId: "magic" }] },
    { code: `const s = { borderRadius: 10 };`, errors: [{ messageId: "magic" }] },
    { code: `<Box p={13} />;`, errors: [{ messageId: "magic" }] },
  ],
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/no-magic-number.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the rule**

```ts
// src/eslint/rules/no-magic-number.ts
import type { Rule } from "eslint";
import type { Node, Property, Literal } from "estree";
import type { JSXAttribute } from "estree-jsx";
import { hasAllowComment } from "../allow-comment.js";

const DEFAULT_PROPS = [
  "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "paddingHorizontal", "paddingVertical",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical",
  "gap", "rowGap", "columnGap", "borderRadius",
  "p", "px", "py", "pt", "pb", "pl", "pr", "m", "mx", "my", "mt", "mb", "ml", "mr",
];

export const noMagicNumber: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw numeric values in tokenized style props; use a spacing/radius token." },
    messages: {
      magic: 'Magic number {{value}} on "{{prop}}" — use a spacing/radius token, or annotate with // huggable-allow: <reason>.',
    },
    schema: [
      {
        type: "object",
        properties: { props: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const opts = (context.options[0] ?? {}) as { props?: string[] };
    const props = new Set(opts.props ?? DEFAULT_PROPS);

    function check(prop: string, valueNode: Node | null | undefined): void {
      if (!valueNode || valueNode.type !== "Literal") return;
      const lit = valueNode as Literal;
      if (typeof lit.value !== "number" || lit.value === 0) return;
      if (hasAllowComment(valueNode, sourceCode)) return;
      context.report({ node: valueNode, messageId: "magic", data: { prop, value: String(lit.value) } });
    }

    return {
      Property(node: Property) {
        const key = node.key.type === "Identifier" ? node.key.name : node.key.type === "Literal" ? String(node.key.value) : undefined;
        if (key && props.has(key)) check(key, node.value as Node);
      },
      JSXAttribute(node: JSXAttribute) {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : undefined;
        if (!name || !props.has(name)) return;
        if (node.value && node.value.type === "JSXExpressionContainer" && node.value.expression.type !== "JSXEmptyExpression") {
          check(name, node.value.expression as Node);
        }
      },
    };
  },
};
```

Note: `estree-jsx` ships with the ESLint type stack; if its types are unavailable, type the JSX nodes as `any` with a `// huggable-allow`-style comment is NOT acceptable — instead import `JSXAttribute` from `estree-jsx`. If the package is genuinely missing, STOP and report; do not silence the types.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/no-magic-number.test.ts`
Expected: PASS (6 valid + 4 invalid).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(eslint): add no-magic-number rule (numeric literals in tokenized style props)"
```

---

### Task 4: Plugin index + recommended config

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/eslint/index.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/eslint/index.test.ts`

**Interfaces:**
- Consumes: the three rule objects.
- Produces: `src/eslint/index.ts` exports `rules` (`Record<string, Rule.RuleModule>`), `plugin` (`{ meta, rules }`), `configs` (`{ recommended }` flat config), and a default export of `plugin`.

- [ ] **Step 1: Write the failing test**

```ts
// test/eslint/index.test.ts
import { describe, it, expect } from "vitest";
import { rules, plugin, configs } from "../../src/eslint/index.js";

describe("eslint-plugin-huggable index", () => {
  it("registers the three rules", () => {
    expect(Object.keys(rules).sort()).toEqual(["no-banned-fonts", "no-magic-number", "no-raw-color"]);
  });
  it("each rule has meta.messages and create", () => {
    for (const rule of Object.values(rules)) {
      expect(typeof rule.create).toBe("function");
      expect(rule.meta?.messages).toBeTruthy();
    }
  });
  it("recommended config references all rules under the huggable/ namespace", () => {
    const ruleKeys = Object.keys(configs.recommended.rules ?? {});
    expect(ruleKeys).toEqual(
      expect.arrayContaining(["huggable/no-raw-color", "huggable/no-banned-fonts", "huggable/no-magic-number"]),
    );
    expect(configs.recommended.plugins?.huggable).toBe(plugin);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/index.test.ts`
Expected: FAIL — `src/eslint/index.js` not found.

- [ ] **Step 3: Implement the index**

```ts
// src/eslint/index.ts
import type { ESLint, Linter, Rule } from "eslint";
import { noRawColor } from "./rules/no-raw-color.js";
import { noBannedFonts } from "./rules/no-banned-fonts.js";
import { noMagicNumber } from "./rules/no-magic-number.js";

export const rules: Record<string, Rule.RuleModule> = {
  "no-raw-color": noRawColor,
  "no-banned-fonts": noBannedFonts,
  "no-magic-number": noMagicNumber,
};

export const plugin: ESLint.Plugin = {
  meta: { name: "eslint-plugin-huggable", version: "0.1.0" },
  rules,
};

export const configs: { recommended: Linter.Config } = {
  recommended: {
    plugins: { huggable: plugin },
    rules: {
      "huggable/no-raw-color": "error",
      "huggable/no-banned-fonts": "error",
      "huggable/no-magic-number": "warn",
    },
  },
};

export default plugin;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/eslint/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run full suite + typecheck**

Run: `cd /Users/olliejarvis/Development/huggable && npm test && npm run typecheck`
Expected: all tests pass (Plans 01–02's 37 + this plan's cases); `tsc --noEmit` exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(eslint): add plugin index + recommended flat config"
```

---

## Self-Review

**1. Spec coverage (this plan = the off-system-value enforcement floor):**
- ESLint plugin, engine-agnostic rules (work on StyleX object literals + Restyle JSX props) — all tasks ✓
- `no-banned-fonts` — Task 1 ✓ · `no-raw-color` — Task 2 ✓ · `no-magic-number` (magic spacing/radius) — Task 3 ✓
- `// huggable-allow: <reason>` escape hatch, honored by every rule — Task 1 helper, exercised in every rule's tests ✓
- Recommended flat config (mechanical = error, heuristic = warn) — Task 4 ✓
- **Deferred to a follow-up plan (Plan 03b) — recorded, not silently dropped:** `tier-import-boundary` (wraps `validateTierBoundaries` from Plan 02 — needs registry.json + file→component resolution), `min-font-size` / `min-hit-target` (numeric guardrails), `no-antislop-patterns` (heuristic: left-border-accent cards, emoji-as-icon). These need more machinery (registry wiring / heuristics) than the value-level rules and are best built once a real app (track-stuff) provides concrete inputs.

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; every test step has a command + expected result. ✓

**3. Type consistency:** `hasAllowComment(node, sourceCode)` defined in Task 1 and consumed unchanged in Tasks 2–3. Rule objects `noBannedFonts`/`noRawColor`/`noMagicNumber` typed as `Rule.RuleModule`, imported by name into Task 4's index. `RuleTester` config identical across test files. ✓
