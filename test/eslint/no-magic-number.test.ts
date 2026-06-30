import { RuleTester } from "eslint";
import { noMagicNumber } from "../../src/eslint/rules/no-magic-number.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run("no-magic-number", noMagicNumber, {
  valid: [
    { code: `const s = { padding: 0 };` }, // 0 allowed
    { code: `const s = { padding: "4" };` }, // token key, not a number
    { code: `<Box p="5" />;` }, // token key string
    { code: `const s = { zoom: 13 };` }, // not a tokenized prop
    { code: `const s = { padding: 13 }; // huggable-allow: third-party widget` },
    { code: `<Box p={16} /* huggable-allow: temp */ />;` },
    { code: `const s = { marginTop: -8 }; // huggable-allow: overlap` },
  ],
  invalid: [
    { code: `const s = { padding: 13 };`, errors: [{ messageId: "magic" }] },
    { code: `const s = { marginTop: 16 };`, errors: [{ messageId: "magic" }] },
    { code: `const s = { borderRadius: 10 };`, errors: [{ messageId: "magic" }] },
    { code: `<Box p={13} />;`, errors: [{ messageId: "magic" }] },
    { code: `const s = { marginTop: -8 };`, errors: [{ messageId: "magic" }] },
    { code: `<Box p={-4} />;`, errors: [{ messageId: "magic" }] },
  ],
});
