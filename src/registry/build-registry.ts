import type { ComponentMeta, Registry } from "./types.js";

export function buildRegistry(components: ComponentMeta[]): Registry {
  // prototype-less map: avoids "constructor"/"toString" key hazards (guard here + validateTierBoundaries lookups).
  const map: Record<string, ComponentMeta> = Object.create(null);
  for (const c of components) {
    if (map[c.name]) throw new Error(`duplicate component "${c.name}" in registry`);
    map[c.name] = c;
  }
  return { components: map };
}
