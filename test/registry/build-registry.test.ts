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
