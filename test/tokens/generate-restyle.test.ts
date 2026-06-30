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
    expect(out).toContain(`paper50: "#FBF9F4"`);
  });
  it("is deterministic", () => {
    expect(generateRestyleTheme(exampleTokens)).toBe(out);
  });
  it("matches snapshot", () => {
    expect(out).toMatchSnapshot();
  });
});
