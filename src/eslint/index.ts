// src/eslint/index.ts
import type { ESLint, Linter, Rule } from "eslint";
import { noRawColor } from "./rules/no-raw-color.js";
import { noBannedFonts } from "./rules/no-banned-fonts.js";
import { noMagicNumber } from "./rules/no-magic-number.js";

export const rules: Record<string, Rule.RuleModule> = {
  "no-raw-color": noRawColor,
  "no-banned-fonts": noBannedFonts,
  "no-magic-number": noMagicNumber,
};

export const plugin: ESLint.Plugin = {
  meta: { name: "eslint-plugin-huggable", version: "0.1.0" },
  rules,
};

export const configs: { recommended: Linter.Config } = {
  recommended: {
    plugins: { huggable: plugin },
    rules: {
      "huggable/no-raw-color": "error",
      "huggable/no-banned-fonts": "error",
      "huggable/no-magic-number": "warn",
    },
  },
};

export default plugin;
