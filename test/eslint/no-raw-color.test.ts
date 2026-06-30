import { RuleTester } from "eslint";
import { noRawColor } from "../../src/eslint/rules/no-raw-color.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run("no-raw-color", noRawColor, {
  valid: [
    { code: `const c = "surface.card";` },
    { code: `const c = "accent.default";` },
    { code: `const c = "#fff"; // huggable-allow: brand asset` },
    { code: `const n = "#notacolor";` },
  ],
  invalid: [
    { code: `const c = "#fff";`, errors: [{ messageId: "rawColor" }] },
    { code: `const c = "#FBF9F4";`, errors: [{ messageId: "rawColor" }] },
    { code: `const c = "#10100Fff";`, errors: [{ messageId: "rawColor" }] },
    { code: `const c = "rgba(0,0,0,0.5)";`, errors: [{ messageId: "rawColor" }] },
    { code: `<Box style={{ backgroundColor: "#000" }} />;`, errors: [{ messageId: "rawColor" }] },
  ],
});
