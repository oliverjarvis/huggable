// src/migrate/scan.ts
import { Project, Node } from "ts-morph";
import { STYLE_NUMBER_PROPS } from "./style-props.js";

export interface StyleFinding {
  prop: string;
  raw: string | number;
  kind: "color" | "number";
  line: number;
}

const COLOR = /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgb|rgba|hsl|hsla)\([^)]*\))$/;

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
    if (Node.isNumericLiteral(init)) {
      const value = Number(init.getLiteralValue());
      if (value !== 0 && numberProps.has(name)) findings.push({ prop: name, raw: value, kind: "number", line });
    }
  });

  return findings;
}
