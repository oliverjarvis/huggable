// src/migrate/scan.ts
import { Project, Node, SyntaxKind } from "ts-morph";
import { STYLE_NUMBER_PROPS } from "./style-props.js";

export interface StyleFinding {
  prop: string;
  raw: string | number;
  kind: "color" | "number";
  line: number;
}

const COLOR = /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgb|rgba|hsl|hsla)\([^)]*\))$/;

/** Numeric value of a NumericLiteral OR a unary +/- numeric literal — so negative
 * style values like `margin: -8` are captured (they parse as PrefixUnaryExpression). */
export function numericValueOf(node: Node): number | null {
  if (Node.isNumericLiteral(node)) return node.getLiteralValue();
  if (Node.isPrefixUnaryExpression(node)) {
    const op = node.getOperatorToken();
    const operand = node.getOperand();
    if (Node.isNumericLiteral(operand) && (op === SyntaxKind.MinusToken || op === SyntaxKind.PlusToken)) {
      const v = operand.getLiteralValue();
      return op === SyntaxKind.MinusToken ? -v : v;
    }
  }
  return null;
}

export function scanStyleValues(sourceText: string, opts: { numberProps?: Set<string> } = {}): StyleFinding[] {
  const numberProps = opts.numberProps ?? STYLE_NUMBER_PROPS;
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile("scan.tsx", sourceText, { overwrite: true });
  const findings: StyleFinding[] = [];

  sf.forEachDescendant((node) => {
    if (!Node.isPropertyAssignment(node)) return;
    const name = node.getName().replace(/^["']|["']$/g, "");
    const init = node.getInitializer();
    if (!init) return;
    const line = node.getStartLineNumber();

    if (Node.isStringLiteral(init)) {
      const value = init.getLiteralValue();
      if (COLOR.test(value.trim())) findings.push({ prop: name, raw: value, kind: "color", line });
      return;
    }
    const num = numericValueOf(init);
    if (num !== null && num !== 0 && numberProps.has(name)) {
      findings.push({ prop: name, raw: num, kind: "number", line });
    }
  });

  return findings;
}
