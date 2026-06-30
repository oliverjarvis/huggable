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
