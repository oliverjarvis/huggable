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
