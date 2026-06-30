// test/eslint/index.test.ts
import { describe, it, expect } from "vitest";
import { rules, plugin, configs } from "../../src/eslint/index.js";

describe("eslint-plugin-huggable index", () => {
  it("registers the three rules", () => {
    expect(Object.keys(rules).sort()).toEqual(["no-banned-fonts", "no-magic-number", "no-raw-color"]);
  });
  it("each rule has meta.messages and create", () => {
    for (const rule of Object.values(rules)) {
      expect(typeof rule.create).toBe("function");
      expect(rule.meta?.messages).toBeTruthy();
    }
  });
  it("recommended config references all rules under the huggable/ namespace", () => {
    const ruleKeys = Object.keys(configs.recommended.rules ?? {});
    expect(ruleKeys).toEqual(
      expect.arrayContaining(["huggable/no-raw-color", "huggable/no-banned-fonts", "huggable/no-magic-number"]),
    );
    expect(configs.recommended.plugins?.huggable).toBe(plugin);
  });
});
