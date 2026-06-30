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
