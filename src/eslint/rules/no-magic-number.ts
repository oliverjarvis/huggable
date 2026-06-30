import type { Rule } from "eslint";
import type { Node, Property, Literal } from "estree";
import type { JSXAttribute } from "estree-jsx";
import { hasAllowComment } from "../allow-comment.js";

const DEFAULT_PROPS = [
  "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "paddingHorizontal", "paddingVertical",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical",
  "gap", "rowGap", "columnGap", "borderRadius",
  "p", "px", "py", "pt", "pb", "pl", "pr", "m", "mx", "my", "mt", "mb", "ml", "mr",
];

export const noMagicNumber: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw numeric values in tokenized style props; use a spacing/radius token." },
    messages: {
      magic: 'Magic number {{value}} on "{{prop}}" — use a spacing/radius token, or annotate with // huggable-allow: <reason>.',
    },
    schema: [
      {
        type: "object",
        properties: { props: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const opts = (context.options[0] ?? {}) as { props?: string[] };
    const props = new Set(opts.props ?? DEFAULT_PROPS);

    function check(prop: string, valueNode: Node | null | undefined): void {
      if (!valueNode || valueNode.type !== "Literal") return;
      const lit = valueNode as Literal;
      if (typeof lit.value !== "number" || lit.value === 0) return;
      if (hasAllowComment(valueNode, sourceCode)) return;
      context.report({ node: valueNode, messageId: "magic", data: { prop, value: String(lit.value) } });
    }

    return {
      Property(node: Property) {
        const key = node.key.type === "Identifier" ? node.key.name : node.key.type === "Literal" ? String(node.key.value) : undefined;
        if (key && props.has(key)) check(key, node.value as Node);
      },
      JSXAttribute(node: JSXAttribute) {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : undefined;
        if (!name || !props.has(name)) return;
        if (node.value && node.value.type === "JSXExpressionContainer" && node.value.expression.type !== "JSXEmptyExpression") {
          check(name, node.value.expression as Node);
        }
      },
    };
  },
};
