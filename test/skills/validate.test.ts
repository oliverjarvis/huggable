import { describe, it, expect } from "vitest";
import { validateSkillFile } from "../../src/skills/validate.js";

const ok = `---
name: establish
description: Use when creating a new design system.
---
Run the codegen at \`src/cli/tokens-codegen.ts\`.`;

const exists = (p: string) => p === "src/cli/tokens-codegen.ts";

describe("validateSkillFile", () => {
  it("passes a well-formed skill whose src refs exist", () => {
    expect(validateSkillFile(ok, { repoRoot: "/x", exists })).toEqual([]);
  });
  it("flags missing frontmatter name/description", () => {
    const bad = `---\nname:\ndescription:\n---\nbody`;
    const errs = validateSkillFile(bad, { repoRoot: "/x", exists });
    expect(errs.some((e) => /name/i.test(e))).toBe(true);
    expect(errs.some((e) => /description/i.test(e))).toBe(true);
  });
  it("flags a referenced src path that does not exist", () => {
    const bad = `---\nname: x\ndescription: y\n---\nSee \`src/does/not-exist.ts\`.`;
    const errs = validateSkillFile(bad, { repoRoot: "/x", exists });
    expect(errs.some((e) => /src\/does\/not-exist\.ts/.test(e))).toBe(true);
  });
});
