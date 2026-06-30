import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSkillFile } from "../../src/skills/validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillsDir = join(repoRoot, "skills");

describe("huggable skills", () => {
  const names = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

  for (const name of names) {
    it(`${name}/SKILL.md is valid (frontmatter + src refs exist)`, () => {
      const md = readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
      const errors = validateSkillFile(md, { repoRoot, exists: (rel) => existsSync(join(repoRoot, rel)) });
      expect(errors).toEqual([]);
    });
  }
});
