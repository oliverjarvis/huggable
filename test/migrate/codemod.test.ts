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

  it("rewrites nested style objects (StyleSheet.create shape) and stays idempotent", () => {
    const src = [
      "const styles = StyleSheet.create({",
      '  card: { padding: 13, backgroundColor: "#FBF9F5" },',
      "  row: { marginTop: 13 },",
      "});",
    ].join("\n");
    const mappings: Mapping[] = [
      { prop: "padding", raw: 13, kind: "number", line: 2, token: "4" },
      { prop: "backgroundColor", raw: "#FBF9F5", kind: "color", line: 2, token: "paper50" },
      { prop: "marginTop", raw: 13, kind: "number", line: 3, token: "4" },
    ];
    const out = applyTokenCodemod(src, mappings);
    expect(out).toContain(`padding: theme.spacing["4"]`);
    expect(out).toContain(`marginTop: theme.spacing["4"]`);
    expect(out).toContain(`backgroundColor: theme.colors["paper50"]`);
    expect(applyTokenCodemod(out, mappings)).toBe(out); // idempotent
  });

  it("honors custom spaceExpr/colorExpr options", () => {
    const mappings: Mapping[] = [{ prop: "padding", raw: 13, kind: "number", line: 1, token: "4" }];
    const out = applyTokenCodemod(`const s = { padding: 13 };`, mappings, { spaceExpr: (t) => `sp(${t})` });
    expect(out).toContain(`padding: sp(4)`);
  });
});
