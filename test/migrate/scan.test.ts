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
