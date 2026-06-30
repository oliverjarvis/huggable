// test/cli/tokens-codegen.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCodegen } from "../../src/cli/tokens-codegen.js";

let dir: string;
let tokensPath: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "huggable-codegen-"));
  tokensPath = join(dir, "tokens.ts");
  // re-export the fixture so the CLI has a real app token module to load
  const fixture = join(process.cwd(), "test/fixtures/example-tokens.ts");
  writeFileSync(tokensPath, `export { exampleTokens as tokens } from ${JSON.stringify(fixture)};\n`);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("runCodegen", () => {
  it("writes both generated files for target=both", async () => {
    const { written } = await runCodegen({ in: tokensPath, outDir: dir, target: "both" });
    expect(written).toContain(join(dir, "theme.ts"));
    expect(written).toContain(join(dir, "tokens.stylex.ts"));
    expect(readFileSync(join(dir, "theme.ts"), "utf8")).toContain("export const lightTheme");
    expect(readFileSync(join(dir, "tokens.stylex.ts"), "utf8")).toContain("stylex.defineVars");
  });

  it("throws when the token source is invalid", async () => {
    const badPath = join(dir, "bad-tokens.ts");
    writeFileSync(
      badPath,
      `import { exampleTokens } from ${JSON.stringify(join(process.cwd(), "test/fixtures/example-tokens.ts"))};
       export const tokens = { ...exampleTokens, primitive: { ...exampleTokens.primitive, fontFamily: { display: "X", body: "Inter", mono: "Y" } } };\n`,
    );
    await expect(runCodegen({ in: badPath, outDir: dir, target: "both" })).rejects.toThrow(/banned font/i);
  });
});
