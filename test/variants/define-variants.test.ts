import { describe, it, expect } from "vitest";
import { defineVariants } from "../../src/variants/define-variants.js";

const button = defineVariants({
  base: { px: "5", py: "3", radius: "md" },
  variants: {
    tone: { primary: { bg: "accent.default" }, neutral: { bg: "surface.card" } },
    size: { sm: { px: "4", py: "2" }, md: { px: "5", py: "3" } },
  },
  defaultVariants: { tone: "primary", size: "md" },
});

describe("defineVariants (base + variants + defaults)", () => {
  it("applies base + default variants when nothing is selected", () => {
    expect(button()).toEqual({ px: "5", py: "3", radius: "md", bg: "accent.default" });
  });
  it("overrides defaults with selected variants (later wins)", () => {
    expect(button({ tone: "neutral", size: "sm" })).toEqual({
      px: "4", py: "2", radius: "md", bg: "surface.card",
    });
  });
  it("falls back to default for unspecified groups", () => {
    expect(button({ size: "sm" })).toEqual({ px: "4", py: "2", radius: "md", bg: "accent.default" });
  });
  it("ignores an unknown variant value (no throw, no style added)", () => {
    expect(button({ tone: "ghost" })).toEqual({ px: "5", py: "3", radius: "md" });
  });
});
