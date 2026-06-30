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
