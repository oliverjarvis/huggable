export interface ValidateOpts {
  repoRoot: string;
  exists: (relPath: string) => boolean;
}

/** Matches src/... path tokens (word chars, /, ., -) ending in a file extension. */
const SRC_REF = /src\/[\w./-]+\.[a-z]{2,4}/g;

export function validateSkillFile(markdown: string, opts: ValidateOpts): string[] {
  const errors: string[] = [];

  const fm = /^---\s*\n([\s\S]*?)\n---/.exec(markdown);
  if (!fm) {
    errors.push("missing frontmatter block (--- ... ---)");
  } else {
    const body = fm[1];
    const name = /^name:[ \t]*(.*)$/m.exec(body)?.[1]?.trim();
    const description = /^description:[ \t]*(.*)$/m.exec(body)?.[1]?.trim();
    if (!name) errors.push("frontmatter is missing a non-empty name");
    if (!description) errors.push("frontmatter is missing a non-empty description");
  }

  const seen = new Set<string>();
  for (const match of markdown.matchAll(SRC_REF)) {
    const ref = match[0];
    if (seen.has(ref)) continue;
    seen.add(ref);
    if (!opts.exists(ref)) errors.push(`referenced path does not exist: ${ref}`);
  }

  return errors;
}
