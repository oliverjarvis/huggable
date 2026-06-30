export type Tier = "primitive" | "element" | "compound" | "pattern";

/** low -> high; index = rank. A component may depend only on strictly lower ranks. */
export const TIER_ORDER: Tier[] = ["primitive", "element", "compound", "pattern"];

export interface ComponentMeta {
  name: string;
  tier: Tier;
  /** names of other registered components this one imports/composes */
  dependsOn: string[];
  /** optional: variant group names this component exposes */
  variants?: string[];
}

export interface Registry {
  components: Record<string, ComponentMeta>;
}
