# Huggable Plan 01 — Plugin Scaffold + Token Layer + Codegen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Huggable plugin repo skeleton and the token foundation: a typed two-tier `TokenSource`, a validator, and codegen that turns one token source into a Restyle theme (RN) and StyleX vars (web).

**Architecture:** Pure generator functions (`tokenSource → string`) wrapped by a thin CLI. The token *source* is owned per-app; the *generators + CLI* live in the plugin. Generators are pure and snapshot-tested; the CLI loads an app's `tokens.ts` via `jiti` and writes the two generated files. Two tiers: primitives (raw values) and per-theme semantic maps (purpose/role names referencing primitive keys). Themes = semantic maps over shared primitives.

**Tech Stack:** TypeScript (strict, ESM), Node 20+, Vitest (tests + snapshots), jiti (load TS token modules at runtime), tsx (run CLI in dev). No bundler needed for v0.1.

## Global Constraints

- Node ≥ 20; TypeScript `strict: true`; ESM (`"type": "module"`).
- NO Tailwind / NativeWind anywhere in generated output.
- Banned font families (validator must reject): `Inter`, `Roboto`, `Arial`, `Open Sans`, `Lato`, `Fraunces`.
- Spacing primitive values must all be even (multiples of 2); `0` allowed. Canonical ramp = `2,4,8,12,16,24,32,40,48,64,80,96,160`.
- Semantic token names are purpose/role (e.g. `bg.canvas`, `text.body`, `surface.card`, `accent.default`) — NOT scale numbers.
- Themes shipped by the first build: `light`, `dark`, `brand`. First theme in the array is the base/default.
- Generated files are emitted, never hand-edited. Generator output must be deterministic (stable key order).
- Min interactive size 44; min font size 12 (used by later lint plan; validator only warns here).

---

### Task 1: Scaffold the plugin repo

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/package.json`
- Create: `/Users/olliejarvis/Development/huggable/tsconfig.json`
- Create: `/Users/olliejarvis/Development/huggable/vitest.config.ts`
- Create: `/Users/olliejarvis/Development/huggable/.claude-plugin/plugin.json`
- Create: `/Users/olliejarvis/Development/huggable/.gitignore`
- Create: `/Users/olliejarvis/Development/huggable/src/index.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable workspace where `npm test` works; `src/index.ts` exports `export const HUGGABLE_VERSION = "0.1.0"`.

- [ ] **Step 1: Write the failing smoke test**

```ts
// test/smoke.test.ts
import { describe, it, expect } from "vitest";
import { HUGGABLE_VERSION } from "../src/index.js";

describe("smoke", () => {
  it("exposes a version", () => {
    expect(HUGGABLE_VERSION).toBe("0.1.0");
  });
});
```

- [ ] **Step 2: Create config + manifest files**

```json
// package.json
{
  "name": "huggable",
  "version": "0.1.0",
  "description": "Deterministic design-system plugin: create, follow, and migrate-to design systems for React + React Native.",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "tsx": "^4.19.0",
    "jiti": "^2.4.0"
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src", "test"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { globals: true, include: ["test/**/*.test.ts"] },
});
```

```json
// .claude-plugin/plugin.json
{
  "name": "huggable",
  "version": "0.1.0",
  "description": "Deterministically create, follow, and migrate-to coherent, non-slop design systems for React (StyleX) + React Native (Restyle)."
}
```

```gitignore
# .gitignore
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

```ts
// src/index.ts
export const HUGGABLE_VERSION = "0.1.0";
```

- [ ] **Step 3: Install deps and run the test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npm install && npm test`
Expected: 1 passed (`smoke > exposes a version`).

- [ ] **Step 4: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "chore: scaffold huggable plugin repo (ts + vitest + plugin manifest)"
```

---

### Task 2: Token types + example fixture token source

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/tokens/types.ts`
- Create: `/Users/olliejarvis/Development/huggable/test/fixtures/example-tokens.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/tokens/types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts` exports `PrimitiveTokens`, `SemanticTokens`, `ThemeDef`, `TokenSource`, `TextVariant`.
  - `example-tokens.ts` exports `const exampleTokens: TokenSource` (a valid 3-theme source) used by every later test.

- [ ] **Step 1: Write the failing test**

```ts
// test/tokens/types.test.ts
import { describe, it, expect } from "vitest";
import { exampleTokens } from "../fixtures/example-tokens.js";

describe("example token source", () => {
  it("has primitives and the three themes in order", () => {
    expect(Object.keys(exampleTokens.primitive.space).length).toBeGreaterThan(5);
    expect(exampleTokens.themes.map((t) => t.name)).toEqual(["light", "dark", "brand"]);
  });
  it("semantic colors reference existing primitive color keys", () => {
    const keys = new Set(Object.keys(exampleTokens.primitive.color));
    for (const theme of exampleTokens.themes) {
      for (const ref of Object.values(theme.semantic.color)) {
        expect(keys.has(ref)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/types.test.ts`
Expected: FAIL — cannot resolve `../fixtures/example-tokens.js`.

- [ ] **Step 3: Implement the types**

```ts
// src/tokens/types.ts
export type Hex = `#${string}`;

export interface PrimitiveTokens {
  /** raw palette: name -> hex (e.g. blue500). Never used directly in components. */
  color: Record<string, Hex>;
  /** spacing ramp: key -> px. All values even; 0 allowed. */
  space: Record<string, number>;
  radius: Record<string, number>;
  fontFamily: { display: string; body: string; mono: string };
  fontSize: Record<string, number>;
  lineHeight: Record<string, number>;
  fontWeight: Record<string, number>;
  zIndex: Record<string, number>;
  duration: Record<string, number>;
  easing: Record<string, string>;
}

export interface TextVariant {
  /** key of primitive.fontFamily */
  fontFamily: keyof PrimitiveTokens["fontFamily"];
  /** key of primitive.fontSize */
  fontSize: string;
  /** key of primitive.lineHeight */
  lineHeight: string;
  /** key of primitive.fontWeight */
  fontWeight: string;
}

export interface SemanticTokens {
  /** purpose/role name -> primitive.color KEY (e.g. "bg.canvas" -> "slate900") */
  color: Record<string, string>;
  /** purpose/role name -> composite text variant */
  text: Record<string, TextVariant>;
}

export interface ThemeDef {
  name: string;
  semantic: SemanticTokens;
}

export interface TokenSource {
  primitive: PrimitiveTokens;
  /** first theme is the base/default */
  themes: ThemeDef[];
}
```

- [ ] **Step 4: Implement the example fixture**

```ts
// test/fixtures/example-tokens.ts
import type { TokenSource } from "../../src/tokens/types.js";

const space = { "0": 0, "1": 2, "2": 4, "3": 8, "4": 12, "5": 16, "6": 24, "7": 32, "8": 40, "9": 48, "10": 64, "11": 80, "12": 96, "13": 160 };

export const exampleTokens: TokenSource = {
  primitive: {
    color: {
      ink900: "#10100F", ink600: "#4A4A46", paper50: "#FBF9F4", paper100: "#F1ECE1",
      clay500: "#C2410C", clay300: "#FB923C", sage700: "#3F5C4E", line200: "#E2DCCD",
      white: "#FFFFFF", black: "#000000",
    },
    space,
    radius: { none: 0, sm: 4, md: 8, lg: 16, xl: 24, full: 9999 },
    fontFamily: { display: "Clash Display", body: "Geist", mono: "Geist Mono" },
    fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, "2xl": 40, "3xl": 64 },
    lineHeight: { tight: 1.2, snug: 1.35, body: 1.6 },
    fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    zIndex: { base: 0, dropdown: 10, overlay: 100, toast: 1000 },
    duration: { fast: 120, base: 220, slow: 360 },
    easing: { standard: "cubic-bezier(0.2, 0, 0, 1)" },
  },
  themes: [
    {
      name: "light",
      semantic: {
        color: {
          "bg.canvas": "paper50", "bg.subtle": "paper100", "surface.card": "white",
          "text.body": "ink900", "text.muted": "ink600", "border.subtle": "line200",
          "accent.default": "clay500", "accent.text": "white",
        },
        text: {
          heading: { fontFamily: "display", fontSize: "2xl", lineHeight: "tight", fontWeight: "bold" },
          body: { fontFamily: "body", fontSize: "md", lineHeight: "body", fontWeight: "regular" },
          caption: { fontFamily: "body", fontSize: "sm", lineHeight: "snug", fontWeight: "medium" },
        },
      },
    },
    {
      name: "dark",
      semantic: {
        color: {
          "bg.canvas": "ink900", "bg.subtle": "ink600", "surface.card": "ink600",
          "text.body": "paper50", "text.muted": "paper100", "border.subtle": "ink600",
          "accent.default": "clay300", "accent.text": "ink900",
        },
        text: {
          heading: { fontFamily: "display", fontSize: "2xl", lineHeight: "tight", fontWeight: "bold" },
          body: { fontFamily: "body", fontSize: "md", lineHeight: "body", fontWeight: "regular" },
          caption: { fontFamily: "body", fontSize: "sm", lineHeight: "snug", fontWeight: "medium" },
        },
      },
    },
    {
      name: "brand",
      semantic: {
        color: {
          "bg.canvas": "sage700", "bg.subtle": "ink600", "surface.card": "paper50",
          "text.body": "paper50", "text.muted": "paper100", "border.subtle": "sage700",
          "accent.default": "clay500", "accent.text": "white",
        },
        text: {
          heading: { fontFamily: "display", fontSize: "2xl", lineHeight: "tight", fontWeight: "bold" },
          body: { fontFamily: "body", fontSize: "md", lineHeight: "body", fontWeight: "regular" },
          caption: { fontFamily: "body", fontSize: "sm", lineHeight: "snug", fontWeight: "medium" },
        },
      },
    },
  ],
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(tokens): add TokenSource types + example 3-theme fixture"
```

---

### Task 3: Token source validator

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/tokens/validate.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/tokens/validate.test.ts`

**Interfaces:**
- Consumes: `TokenSource` from `src/tokens/types.ts`; `exampleTokens` fixture.
- Produces: `validateTokenSource(src: TokenSource): { errors: string[]; warnings: string[] }`. Empty `errors` = valid.

- [ ] **Step 1: Write the failing test**

```ts
// test/tokens/validate.test.ts
import { describe, it, expect } from "vitest";
import { validateTokenSource } from "../../src/tokens/validate.js";
import { exampleTokens } from "../fixtures/example-tokens.js";

describe("validateTokenSource", () => {
  it("passes the example fixture", () => {
    expect(validateTokenSource(exampleTokens).errors).toEqual([]);
  });

  it("rejects banned fonts", () => {
    const bad = structuredClone(exampleTokens);
    bad.primitive.fontFamily.body = "Inter";
    const { errors } = validateTokenSource(bad);
    expect(errors.some((e) => /banned font/i.test(e))).toBe(true);
  });

  it("rejects odd spacing values", () => {
    const bad = structuredClone(exampleTokens);
    bad.primitive.space["odd"] = 13;
    const { errors } = validateTokenSource(bad);
    expect(errors.some((e) => /spacing.*even/i.test(e))).toBe(true);
  });

  it("rejects a semantic color referencing a missing primitive", () => {
    const bad = structuredClone(exampleTokens);
    bad.themes[0].semantic.color["bg.canvas"] = "doesNotExist";
    const { errors } = validateTokenSource(bad);
    expect(errors.some((e) => /unknown primitive color/i.test(e))).toBe(true);
  });

  it("rejects a text variant referencing an unknown fontSize", () => {
    const bad = structuredClone(exampleTokens);
    bad.themes[0].semantic.text["body"].fontSize = "doesNotExist";
    const { errors } = validateTokenSource(bad);
    expect(errors.some((e) => /unknown fontSize/i.test(e))).toBe(true);
  });

  it("warns on font sizes below the 12px floor", () => {
    const bad = structuredClone(exampleTokens);
    bad.primitive.fontSize["xs"] = 10;
    const { warnings } = validateTokenSource(bad);
    expect(warnings.some((w) => /below the 12px floor/i.test(w))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/validate.test.ts`
Expected: FAIL — `validateTokenSource` not found.

- [ ] **Step 3: Implement the validator**

```ts
// src/tokens/validate.ts
import type { TokenSource } from "./types.js";

const BANNED_FONTS = ["inter", "roboto", "arial", "open sans", "lato", "fraunces"];

export function validateTokenSource(src: TokenSource): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // banned fonts
  for (const [role, family] of Object.entries(src.primitive.fontFamily)) {
    if (BANNED_FONTS.includes(family.trim().toLowerCase())) {
      errors.push(`banned font: fontFamily.${role} = "${family}"`);
    }
  }

  // spacing must be even (0 allowed)
  for (const [key, val] of Object.entries(src.primitive.space)) {
    if (val !== 0 && val % 2 !== 0) {
      errors.push(`spacing values must be even (multiples of 2): space.${key} = ${val}`);
    }
  }

  // min font size warning
  for (const [key, val] of Object.entries(src.primitive.fontSize)) {
    if (val < 12) warnings.push(`fontSize.${key} = ${val} is below the 12px floor`);
  }

  // semantic refs must resolve
  const colorKeys = new Set(Object.keys(src.primitive.color));
  const familyKeys = new Set(Object.keys(src.primitive.fontFamily));
  const sizeKeys = new Set(Object.keys(src.primitive.fontSize));
  const lhKeys = new Set(Object.keys(src.primitive.lineHeight));
  const weightKeys = new Set(Object.keys(src.primitive.fontWeight));

  for (const theme of src.themes) {
    for (const [name, ref] of Object.entries(theme.semantic.color)) {
      if (!colorKeys.has(ref)) {
        errors.push(`[${theme.name}] unknown primitive color "${ref}" for semantic "${name}"`);
      }
    }
    for (const [name, tv] of Object.entries(theme.semantic.text)) {
      if (!familyKeys.has(tv.fontFamily)) errors.push(`[${theme.name}] text.${name}: unknown fontFamily "${tv.fontFamily}"`);
      if (!sizeKeys.has(tv.fontSize)) errors.push(`[${theme.name}] text.${name}: unknown fontSize "${tv.fontSize}"`);
      if (!lhKeys.has(tv.lineHeight)) errors.push(`[${theme.name}] text.${name}: unknown lineHeight "${tv.lineHeight}"`);
      if (!weightKeys.has(tv.fontWeight)) errors.push(`[${theme.name}] text.${name}: unknown fontWeight "${tv.fontWeight}"`);
    }
  }

  if (src.themes.length === 0) errors.push("token source has no themes");
  return { errors, warnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/validate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(tokens): add validateTokenSource (banned fonts, even spacing, ref integrity)"
```

---

### Task 4: Restyle theme generator

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/tokens/generate-restyle.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/tokens/generate-restyle.test.ts`

**Interfaces:**
- Consumes: `TokenSource`; `exampleTokens`.
- Produces: `generateRestyleTheme(src: TokenSource): string` — a TS module string. Theme names map to exported consts: `light` → `lightTheme`, etc. First theme also exported as `defaultTheme` and `type Theme = typeof <firstTheme>`.

- [ ] **Step 1: Write the failing test**

```ts
// test/tokens/generate-restyle.test.ts
import { describe, it, expect } from "vitest";
import { generateRestyleTheme } from "../../src/tokens/generate-restyle.js";
import { exampleTokens } from "../fixtures/example-tokens.js";

describe("generateRestyleTheme", () => {
  const out = generateRestyleTheme(exampleTokens);

  it("imports createTheme from restyle", () => {
    expect(out).toContain(`import { createTheme } from "@shopify/restyle"`);
  });
  it("emits a theme per source theme + a default + Theme type", () => {
    expect(out).toContain("export const lightTheme");
    expect(out).toContain("export const darkTheme");
    expect(out).toContain("export const brandTheme");
    expect(out).toContain("export const defaultTheme = lightTheme");
    expect(out).toContain("export type Theme = typeof lightTheme");
  });
  it("resolves semantic colors to primitive hex via palette refs", () => {
    // bg.canvas -> paper50 -> #FBF9F4
    expect(out).toContain(`"bg.canvas": palette.paper50`);
    expect(out).toContain(`"paper50": "#FBF9F4"`);
  });
  it("is deterministic", () => {
    expect(generateRestyleTheme(exampleTokens)).toBe(out);
  });
  it("matches snapshot", () => {
    expect(out).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/generate-restyle.test.ts`
Expected: FAIL — `generateRestyleTheme` not found.

- [ ] **Step 3: Implement the generator**

```ts
// src/tokens/generate-restyle.ts
import type { TokenSource, ThemeDef } from "./types.js";

const j = (v: unknown) => JSON.stringify(v);

function paletteBlock(src: TokenSource): string {
  const entries = Object.entries(src.primitive.color).map(([k, v]) => `  ${j(k)}: ${j(v)},`);
  return `const palette = {\n${entries.join("\n")}\n};`;
}

function themeBlock(src: TokenSource, theme: ThemeDef): string {
  const colors = Object.entries(theme.semantic.color)
    .map(([name, ref]) => `    ${j(name)}: palette.${ref},`)
    .join("\n");
  const spacing = Object.entries(src.primitive.space)
    .map(([k, v]) => `    ${j(k)}: ${v},`)
    .join("\n");
  const radii = Object.entries(src.primitive.radius)
    .map(([k, v]) => `    ${j(k)}: ${v},`)
    .join("\n");
  const textVariants = Object.entries(theme.semantic.text)
    .map(([name, tv]) => {
      return `    ${j(name)}: { fontFamily: ${j(src.primitive.fontFamily[tv.fontFamily])}, fontSize: ${src.primitive.fontSize[tv.fontSize]}, lineHeight: ${Math.round(src.primitive.fontSize[tv.fontSize] * src.primitive.lineHeight[tv.lineHeight])}, fontWeight: ${j(String(src.primitive.fontWeight[tv.fontWeight]))} },`;
    })
    .join("\n");
  return `export const ${theme.name}Theme = createTheme({
  colors: {
${colors}
  },
  spacing: {
${spacing}
  },
  borderRadii: {
${radii}
  },
  textVariants: {
${textVariants}
  },
});`;
}

export function generateRestyleTheme(src: TokenSource): string {
  const header = `// AUTO-GENERATED by huggable tokens-codegen. Do not edit by hand.
import { createTheme } from "@shopify/restyle";

${paletteBlock(src)}`;
  const themes = src.themes.map((t) => themeBlock(src, t)).join("\n\n");
  const first = src.themes[0].name;
  const footer = `export const defaultTheme = ${first}Theme;
export type Theme = typeof ${first}Theme;`;
  return [header, themes, footer].join("\n\n") + "\n";
}
```

- [ ] **Step 4: Run test to verify it passes (and write the snapshot)**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/generate-restyle.test.ts`
Expected: PASS (5 tests; snapshot written on first run). Open the generated snapshot under `test/tokens/__snapshots__/` and eyeball that it's valid TS.

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(tokens): add Restyle theme generator (palette + per-theme createTheme)"
```

---

### Task 5: StyleX vars generator

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/tokens/generate-stylex.ts`
- Test: `/Users/olliejarvis/Development/huggable/test/tokens/generate-stylex.test.ts`

**Interfaces:**
- Consumes: `TokenSource`; `exampleTokens`.
- Produces: `generateStylexVars(src: TokenSource): string`. Light (first theme) values are the `defineVars` defaults; other themes are `createTheme` overrides. Dotted semantic names → camelCase var keys via `toVarKey` (exported for reuse/testing).

- [ ] **Step 1: Write the failing test**

```ts
// test/tokens/generate-stylex.test.ts
import { describe, it, expect } from "vitest";
import { generateStylexVars, toVarKey } from "../../src/tokens/generate-stylex.js";
import { exampleTokens } from "../fixtures/example-tokens.js";

describe("toVarKey", () => {
  it("camelCases dotted role names", () => {
    expect(toVarKey("bg.canvas")).toBe("bgCanvas");
    expect(toVarKey("accent.default")).toBe("accentDefault");
  });
});

describe("generateStylexVars", () => {
  const out = generateStylexVars(exampleTokens);
  it("imports stylex", () => {
    expect(out).toContain(`import * as stylex from "@stylexjs/stylex"`);
  });
  it("defines defaults from the first theme and themes via createTheme", () => {
    expect(out).toContain("export const colors = stylex.defineVars(");
    expect(out).toContain(`bgCanvas: "#FBF9F4"`); // light default resolved to hex
    expect(out).toContain("export const darkTheme = stylex.createTheme(colors,");
    expect(out).toContain("export const brandTheme = stylex.createTheme(colors,");
  });
  it("is deterministic + snapshot", () => {
    expect(generateStylexVars(exampleTokens)).toBe(out);
    expect(out).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/generate-stylex.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the generator**

```ts
// src/tokens/generate-stylex.ts
import type { TokenSource, ThemeDef } from "./types.js";

const j = (v: unknown) => JSON.stringify(v);

export function toVarKey(roleName: string): string {
  return roleName
    .split(".")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

function resolvedColors(src: TokenSource, theme: ThemeDef): Array<[string, string]> {
  return Object.entries(theme.semantic.color).map(([name, ref]) => [toVarKey(name), src.primitive.color[ref]]);
}

export function generateStylexVars(src: TokenSource): string {
  const [base, ...rest] = src.themes;
  const defaults = resolvedColors(src, base)
    .map(([k, v]) => `  ${k}: ${j(v)},`)
    .join("\n");

  const spacing = Object.entries(src.primitive.space)
    .map(([k, v]) => `  space${k}: "${v}px",`)
    .join("\n");

  const overrides = rest
    .map((theme) => {
      const body = resolvedColors(src, theme)
        .map(([k, v]) => `  ${k}: ${j(v)},`)
        .join("\n");
      return `export const ${theme.name}Theme = stylex.createTheme(colors, {\n${body}\n});`;
    })
    .join("\n\n");

  return `// AUTO-GENERATED by huggable tokens-codegen. Do not edit by hand.
import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
${defaults}
});

export const spacing = stylex.defineVars({
${spacing}
});

${overrides}
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/tokens/generate-stylex.test.ts`
Expected: PASS (4 tests; snapshot written).

- [ ] **Step 5: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(tokens): add StyleX vars generator (defineVars defaults + createTheme overrides)"
```

---

### Task 6: `tokens-codegen` CLI

**Files:**
- Create: `/Users/olliejarvis/Development/huggable/src/cli/tokens-codegen.ts`
- Modify: `/Users/olliejarvis/Development/huggable/package.json` (add `bin` + a `codegen` script)
- Test: `/Users/olliejarvis/Development/huggable/test/cli/tokens-codegen.test.ts`

**Interfaces:**
- Consumes: `validateTokenSource`, `generateRestyleTheme`, `generateStylexVars`, `TokenSource`.
- Produces: `runCodegen(opts: { in: string; outDir: string; target: "rn" | "web" | "both" }): Promise<{ written: string[] }>`. Loads the app token module via `jiti`, expecting a default export OR a named export `tokens` of type `TokenSource`. Throws if validation has errors. CLI entry parses `--in`, `--out-dir`, `--target` (default `both`).

- [ ] **Step 1: Write the failing integration test**

```ts
// test/cli/tokens-codegen.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCodegen } from "../../src/cli/tokens-codegen.js";

let dir: string;
let tokensPath: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "huggable-codegen-"));
  tokensPath = join(dir, "tokens.ts");
  // re-export the fixture so the CLI has a real app token module to load
  const fixture = join(process.cwd(), "test/fixtures/example-tokens.ts");
  writeFileSync(tokensPath, `export { exampleTokens as tokens } from ${JSON.stringify(fixture)};\n`);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("runCodegen", () => {
  it("writes both generated files for target=both", async () => {
    const { written } = await runCodegen({ in: tokensPath, outDir: dir, target: "both" });
    expect(written).toContain(join(dir, "theme.ts"));
    expect(written).toContain(join(dir, "tokens.stylex.ts"));
    expect(readFileSync(join(dir, "theme.ts"), "utf8")).toContain("export const lightTheme");
    expect(readFileSync(join(dir, "tokens.stylex.ts"), "utf8")).toContain("stylex.defineVars");
  });

  it("throws when the token source is invalid", async () => {
    const badPath = join(dir, "bad-tokens.ts");
    writeFileSync(
      badPath,
      `import { exampleTokens } from ${JSON.stringify(join(process.cwd(), "test/fixtures/example-tokens.ts"))};
       export const tokens = { ...exampleTokens, primitive: { ...exampleTokens.primitive, fontFamily: { display: "X", body: "Inter", mono: "Y" } } };\n`,
    );
    await expect(runCodegen({ in: badPath, outDir: dir, target: "both" })).rejects.toThrow(/banned font/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/cli/tokens-codegen.test.ts`
Expected: FAIL — `runCodegen` not found.

- [ ] **Step 3: Implement the CLI module**

```ts
// src/cli/tokens-codegen.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const TARGETS = ["rn", "web", "both"] as const;
import { createJiti } from "jiti";
import type { TokenSource } from "../tokens/types.js";
import { validateTokenSource } from "../tokens/validate.js";
import { generateRestyleTheme } from "../tokens/generate-restyle.js";
import { generateStylexVars } from "../tokens/generate-stylex.js";

export interface CodegenOptions {
  in: string;
  outDir: string;
  target: "rn" | "web" | "both";
}

async function loadTokenSource(path: string): Promise<TokenSource> {
  const jiti = createJiti(import.meta.url);
  const mod = (await jiti.import(resolve(path))) as Record<string, unknown>;
  const src = (mod.tokens ?? mod.default) as TokenSource | undefined;
  if (!src) throw new Error(`token module ${path} must export "tokens" or a default TokenSource`);
  return src;
}

export async function runCodegen(opts: CodegenOptions): Promise<{ written: string[] }> {
  if (!TARGETS.includes(opts.target)) {
    throw new Error(`invalid target "${opts.target}" (expected: ${TARGETS.join("|")})`);
  }
  const src = await loadTokenSource(opts.in);
  const { errors } = validateTokenSource(src);
  if (errors.length) throw new Error(`invalid token source:\n - ${errors.join("\n - ")}`);

  mkdirSync(opts.outDir, { recursive: true });
  const written: string[] = [];
  if (opts.target === "rn" || opts.target === "both") {
    const p = join(opts.outDir, "theme.ts");
    writeFileSync(p, generateRestyleTheme(src));
    written.push(p);
  }
  if (opts.target === "web" || opts.target === "both") {
    const p = join(opts.outDir, "tokens.stylex.ts");
    writeFileSync(p, generateStylexVars(src));
    written.push(p);
  }
  return { written };
}

function parseArgs(argv: string[]): CodegenOptions {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const inPath = get("--in");
  const outDir = get("--out-dir");
  const target = (get("--target") ?? "both") as CodegenOptions["target"];
  if (!inPath || !outDir) throw new Error("usage: tokens-codegen --in <tokens.ts> --out-dir <dir> [--target rn|web|both]");
  return { in: inPath, outDir, target };
}

// CLI entry (only runs when invoked directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  runCodegen(parseArgs(process.argv.slice(2)))
    .then(({ written }) => {
      for (const p of written) console.log(`wrote ${p}`);
    })
    .catch((err) => {
      console.error(String(err.message ?? err));
      process.exit(1);
    });
}
```

- [ ] **Step 4: Wire package.json bin + script**

Add to `package.json` (alongside existing `scripts`):

```json
  "bin": { "huggable-tokens-codegen": "src/cli/tokens-codegen.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "codegen": "tsx src/cli/tokens-codegen.ts"
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/olliejarvis/Development/huggable && npx vitest run test/cli/tokens-codegen.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full suite + typecheck**

Run: `cd /Users/olliejarvis/Development/huggable && npm test && npm run typecheck`
Expected: all tests pass; `tsc --noEmit` exits 0.

- [ ] **Step 7: Commit**

```bash
cd /Users/olliejarvis/Development/huggable
git add -A
git commit -m "feat(cli): add tokens-codegen (load app tokens via jiti, validate, emit RN + web)"
```

---

## Self-Review

**1. Spec coverage (this plan covers the §5 token layer + the `tokens-codegen` script only):**
- Two-tier primitive→semantic source — Task 2 ✓
- Purpose/role semantic names — Task 2 fixture + types ✓
- Carbon even-spacing scale + guardrails (banned fonts, min font size) — Task 3 validator ✓
- Light + dark + brand themes via semantic re-pointing — Task 2 fixture, Tasks 4–5 generators ✓
- Codegen → Restyle theme (RN) + StyleX vars (web), generated-not-edited, deterministic — Tasks 4–6 ✓
- Plugin manifest/scaffold — Task 1 ✓
- (Out of scope here, in later plans: ESLint plugin, components/`defineVariants`, migration, screenshot harness, skills, track-stuff proof.)

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; every test step has a command + expected result. ✓

**3. Type consistency:** `TokenSource`/`PrimitiveTokens`/`SemanticTokens`/`ThemeDef`/`TextVariant` defined in Task 2 and used identically in Tasks 3–6. `generateRestyleTheme`, `generateStylexVars`, `toVarKey`, `validateTokenSource`, `runCodegen`/`CodegenOptions` signatures match between their defining task and the CLI consumer in Task 6. ✓

**Note for executor:** snapshot files are created on first test run; review them once for valid TS before committing. The CLI uses `jiti` to load TS token modules at runtime — no precompile needed.

---

## Post-Review Amendments (applied during execution)

Changes made during the SDD review loops, beyond the original task text above:

- **Task 1:** added `@types/node` to devDependencies so `npm run typecheck` works (the CLI uses `node:*` modules).
- **Task 3:** added two tests — TextVariant-ref error path and the min-font-size warning path.
- **Task 4:** quote palette keys (`${j(k)}`) so non-identifier-safe color names emit valid TS.
- **Task 6:** validate `--target` (throw on invalid instead of silently emitting nothing) and `mkdirSync(outDir, { recursive: true })` before writes.
- **Final review (Important):**
  - `generate-restyle.ts` now emits a `breakpoints` block (Restyle's `BaseTheme` requires it). Sourced from an optional `PrimitiveTokens.breakpoints`, defaulting to `{ phone: 0, tablet: 768 }`.
  - `validateTokenSource` now errors if any theme's semantic color/text key set differs from the base (first) theme — prevents web/RN drift, since the StyleX generator builds `defineVars` from the base theme only.

**Carry-over to Plan 02 (component system):**
1. The StyleX/web generator currently emits only `colors` + `spacing`; add `radius` + `text` (typography) to web output before components consume it.
2. Export a single canonical key-derivation helper (`toVarKey` for web + an RN dotted-key counterpart) from the token layer so RN (dotted keys) and web (identifiers) cannot drift.

**Final state:** 24 tests passing, `typecheck` exit 0.
