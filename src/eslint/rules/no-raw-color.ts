import type { Rule } from "eslint";
import type { Literal } from "estree";
import { hasAllowComment } from "../allow-comment.js";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC = /^(?:rgb|rgba|hsl|hsla)\(/i;

function isRawColor(value: string): boolean {
  const v = value.trim();
  return HEX.test(v) || FUNC.test(v);
}

export const noRawColor: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw color literals; reference a design token instead." },
    messages: {
      rawColor: 'Raw color "{{value}}" — use a design token, or annotate with // huggable-allow: <reason>.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Literal(node: Literal) {
        if (typeof node.value !== "string") return;
        if (!isRawColor(node.value)) return;
        if (hasAllowComment(node, sourceCode)) return;
        context.report({ node, messageId: "rawColor", data: { value: node.value } });
      },
    };
  },
};
