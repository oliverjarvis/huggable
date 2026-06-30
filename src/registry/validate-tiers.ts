import type { Registry, Tier } from "./types.js";
import { TIER_ORDER } from "./types.js";

const rank = (t: Tier): number => TIER_ORDER.indexOf(t);

export function validateTierBoundaries(reg: Registry): string[] {
  const errors: string[] = [];
  for (const component of Object.values(reg.components)) {
    for (const depName of component.dependsOn) {
      const dep = reg.components[depName];
      if (!dep) {
        errors.push(`${component.name} (${component.tier}) depends on unknown component "${depName}"`);
        continue;
      }
      if (rank(dep.tier) >= rank(component.tier)) {
        errors.push(
          `${component.name} (${component.tier}) imports ${dep.name} (${dep.tier}) — components may only import from strictly lower tiers`,
        );
      }
    }
  }
  return errors;
}
