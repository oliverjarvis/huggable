// src/eslint/rules/no-banned-fonts.ts
import type { Rule } from "eslint";
import type { Literal } from "estree";
import { hasAllowComment } from "../allow-comment.js";

const BANNED = new Set(["inter", "roboto", "arial", "open sans", "lato", "fraunces"]);

export const noBannedFonts: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow generic/overused font families; choose a distinctive typeface." },
    messages: {
      banned: 'Banned font "{{name}}" — choose a distinctive typeface, or annotate with // huggable-allow: <reason>.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Literal(node: Literal) {
        if (typeof node.value !== "string") return;
        if (!BANNED.has(node.value.trim().toLowerCase())) return;
        if (hasAllowComment(node, sourceCode)) return;
        context.report({ node, messageId: "banned", data: { name: node.value } });
      },
    };
  },
};
