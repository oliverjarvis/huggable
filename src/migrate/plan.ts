// src/migrate/plan.ts
import { scanStyleValues } from "./scan.js";
import { snapNumber, snapColor } from "./snap.js";

export interface Mapping {
  prop: string;
  raw: string | number;
  kind: "color" | "number";
  line: number;
  token: string;
}
export interface Flagged {
  prop: string;
  raw: string | number;
  kind: "color" | "number";
  line: number;
  nearest: string;
  distance: number;
}
export interface MigrationPlan {
  mappings: Mapping[];
  flagged: Flagged[];
}

export function buildMigrationPlan(
  sourceText: string,
  tokens: { space: Record<string, number>; palette: Record<string, string> },
): MigrationPlan {
  const mappings: Mapping[] = [];
  const flagged: Flagged[] = [];

  for (const finding of scanStyleValues(sourceText)) {
    const result =
      finding.kind === "number"
        ? snapNumber(finding.raw as number, tokens.space)
        : snapColor(finding.raw as string, tokens.palette);

    if (result.status === "snapped") {
      mappings.push({ prop: finding.prop, raw: finding.raw, kind: finding.kind, line: finding.line, token: result.token });
    } else {
      flagged.push({
        prop: finding.prop,
        raw: finding.raw,
        kind: finding.kind,
        line: finding.line,
        nearest: result.nearest,
        distance: result.distance,
      });
    }
  }

  return { mappings, flagged };
}
