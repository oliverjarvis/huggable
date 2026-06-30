import type { ComponentMeta, Registry } from "./types.js";

export function buildRegistry(components: ComponentMeta[]): Registry {
  const map: Record<string, ComponentMeta> = {};
  for (const c of components) {
    if (map[c.name]) throw new Error(`duplicate component "${c.name}" in registry`);
    map[c.name] = c;
  }
  return { components: map };
}
