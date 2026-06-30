// test/eslint/no-banned-fonts.test.ts
import { RuleTester } from "eslint";
import { noBannedFonts } from "../../src/eslint/rules/no-banned-fonts.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run("no-banned-fonts", noBannedFonts, {
  valid: [
    { code: `const f = "Clash Display";` },
    { code: `const f = "Geist Mono";` },
    { code: `const f = "Inter"; // huggable-allow: legacy screen` },
    { code: `// huggable-allow: migration\nconst f = "Roboto";` },
  ],
  invalid: [
    { code: `const f = "Inter";`, errors: [{ messageId: "banned" }] },
    { code: `const f = "roboto";`, errors: [{ messageId: "banned" }] },
    { code: `const f = "OPEN SANS";`, errors: [{ messageId: "banned" }] },
    { code: `<Text style={{ fontFamily: "Fraunces" }} />;`, errors: [{ messageId: "banned" }] },
  ],
});
