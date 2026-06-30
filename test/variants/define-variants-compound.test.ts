import { describe, it, expect } from "vitest";
import { defineVariants } from "../../src/variants/define-variants.js";

const chip = defineVariants({
  base: { radius: "full" },
  variants: {
    tone: { primary: { bg: "accent.default" }, neutral: { bg: "surface.card" } },
    disabled: { true: { bg: "bg.subtle" }, false: {} },
  },
  defaultVariants: { tone: "primary", disabled: false },
  compoundVariants: [
    { tone: "primary", disabled: true, style: { bg: "border.subtle", opacity: 0.5 } },
  ],
});

describe("defineVariants (compound + boolean)", () => {
  it("handles boolean variants via true/false keys", () => {
    expect(chip({ disabled: true })).toEqual({
      radius: "full",
      bg: "border.subtle", // compound override wins over the disabled=true variant
      opacity: 0.5,
    });
  });
  it("does not apply a compound variant when conditions do not all match", () => {
    expect(chip({ tone: "neutral", disabled: true })).toEqual({ radius: "full", bg: "bg.subtle" });
  });
  it("applies compound variants after base+variants (array order, later wins)", () => {
    const x = defineVariants({
      base: {},
      variants: { a: { on: { color: "x" } } },
      defaultVariants: { a: "on" },
      compoundVariants: [
        { a: "on", style: { color: "y" } },
        { a: "on", style: { color: "z" } },
      ],
    });
    expect(x()).toEqual({ color: "z" });
  });
});
