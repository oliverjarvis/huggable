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
