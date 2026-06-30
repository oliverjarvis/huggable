// src/eslint/allow-comment.ts
import type { Rule } from "eslint";
import type { Node } from "estree";

/** True if a `// huggable-allow: <reason>` comment sits trailing on the node's line or standalone on the line directly above it. */
export function hasAllowComment(node: Node, sourceCode: Rule.RuleContext["sourceCode"]): boolean {
  if (!node.loc) return false;
  const line = node.loc.start.line;
  return sourceCode.getAllComments().some((comment) => {
    if (!comment.loc) return false;
    if (!/huggable-allow:\s*\S/.test(comment.value)) return false; // require a reason
    if (comment.loc.end.line === line) return true; // trailing comment on the node's own line
    if (comment.loc.start.line === line - 1) {
      // standalone only: nothing but whitespace before the comment on its line
      const lineText = sourceCode.lines[comment.loc.start.line - 1] ?? "";
      return lineText.slice(0, comment.loc.start.column).trim() === "";
    }
    return false;
  });
}
