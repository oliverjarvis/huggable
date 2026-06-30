// src/cli/tokens-codegen.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createJiti } from "jiti";
import type { TokenSource } from "../tokens/types.js";
import { validateTokenSource } from "../tokens/validate.js";
import { generateRestyleTheme } from "../tokens/generate-restyle.js";
import { generateStylexVars } from "../tokens/generate-stylex.js";

const TARGETS = ["rn", "web", "both"] as const;

export interface CodegenOptions {
  in: string;
  outDir: string;
  target: "rn" | "web" | "both";
}

async function loadTokenSource(path: string): Promise<TokenSource> {
  const jiti = createJiti(import.meta.url);
  const mod = (await jiti.import(resolve(path))) as Record<string, unknown>;
  const src = (mod.tokens ?? mod.default) as TokenSource | undefined;
  if (!src) throw new Error(`token module ${path} must export "tokens" or a default TokenSource`);
  return src;
}

export async function runCodegen(opts: CodegenOptions): Promise<{ written: string[] }> {
  if (!TARGETS.includes(opts.target)) {
    throw new Error(`invalid target "${opts.target}" (expected: ${TARGETS.join("|")})`);
  }

  const src = await loadTokenSource(opts.in);
  const { errors } = validateTokenSource(src);
  if (errors.length) throw new Error(`invalid token source:\n - ${errors.join("\n - ")}`);

  mkdirSync(opts.outDir, { recursive: true });
  const written: string[] = [];
  if (opts.target === "rn" || opts.target === "both") {
    const p = join(opts.outDir, "theme.ts");
    writeFileSync(p, generateRestyleTheme(src));
    written.push(p);
  }
  if (opts.target === "web" || opts.target === "both") {
    const p = join(opts.outDir, "tokens.stylex.ts");
    writeFileSync(p, generateStylexVars(src));
    written.push(p);
  }
  return { written };
}

function parseArgs(argv: string[]): CodegenOptions {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const inPath = get("--in");
  const outDir = get("--out-dir");
  const target = (get("--target") ?? "both") as CodegenOptions["target"];
  if (!inPath || !outDir) throw new Error("usage: tokens-codegen --in <tokens.ts> --out-dir <dir> [--target rn|web|both]");
  return { in: inPath, outDir, target };
}

// CLI entry (only runs when invoked directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  runCodegen(parseArgs(process.argv.slice(2)))
    .then(({ written }) => {
      for (const p of written) console.log(`wrote ${p}`);
    })
    .catch((err) => {
      console.error(String(err.message ?? err));
      process.exit(1);
    });
}
