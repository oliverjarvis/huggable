// src/eslint/allow-comment.ts
import type { Rule } from "eslint";
import type { Node } from "estree";

/** True if a `// huggable-allow` comment sits on the node's line or the line directly above it. */
export function hasAllowComment(node: Node, sourceCode: Rule.RuleContext["sourceCode"]): boolean {
  if (!node.loc) return false;
  const line = node.loc.start.line;
  return sourceCode.getAllComments().some((comment) => {
    if (!comment.loc) return false;
    const onSameOrPrevLine = comment.loc.end.line === line || comment.loc.end.line === line - 1;
    return onSameOrPrevLine && /huggable-allow/.test(comment.value);
  });
}
