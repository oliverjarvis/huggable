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
