// src/migrate/codemod.ts
import { Project, Node } from "ts-morph";
import { numericValueOf } from "./scan.js";
import type { Mapping } from "./plan.js";

export function applyTokenCodemod(
  sourceText: string,
  mappings: Mapping[],
  opts: { spaceExpr?: (token: string) => string; colorExpr?: (token: string) => string } = {},
): string {
  const spaceExpr = opts.spaceExpr ?? ((t) => `theme.spacing["${t}"]`);
  const colorExpr = opts.colorExpr ?? ((t) => `theme.colors["${t}"]`);

  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile("codemod.tsx", sourceText, { overwrite: true });

  // index mappings by prop + raw for O(1) lookup
  const byKey = new Map<string, Mapping>();
  for (const m of mappings) byKey.set(`${m.prop}::${String(m.raw)}`, m);

  sf.forEachDescendant((node) => {
    if (!Node.isPropertyAssignment(node)) return;
    const name = node.getName().replace(/^["']|["']$/g, "");
    const init = node.getInitializer();
    if (!init) return;

    let raw: string | null = null;
    const num = numericValueOf(init);
    if (num !== null) raw = String(num);
    else if (Node.isStringLiteral(init)) raw = init.getLiteralValue();
    if (raw === null) return;

    const mapping = byKey.get(`${name}::${raw}`);
    if (!mapping) return;
    init.replaceWithText(mapping.kind === "number" ? spaceExpr(mapping.token) : colorExpr(mapping.token));
  });

  return sf.getFullText();
}
