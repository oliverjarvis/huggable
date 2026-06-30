import type { VariantConfig, VariantSelection, StyleProps } from "./types.js";

export function defineVariants(config: VariantConfig): (selected?: VariantSelection) => StyleProps {
  const { base = {}, variants = {}, defaultVariants = {}, compoundVariants = [] } = config;

  return function resolve(selected: VariantSelection = {}): StyleProps {
    const props: StyleProps = { ...base };

    // resolve each group's effective value (selected or default)
    const effective: Record<string, string> = {};
    for (const group of Object.keys(variants)) {
      const chosen = selected[group] ?? defaultVariants[group];
      if (chosen === undefined) continue;
      effective[group] = String(chosen);
      const styles = variants[group]?.[effective[group]];
      if (styles) Object.assign(props, styles);
    }

    // apply compound variants whose every condition matches the effective values
    for (const compound of compoundVariants) {
      const { style, ...conditions } = compound;
      const matches = Object.entries(conditions).every(
        ([group, value]) => effective[group] === String(value),
      );
      if (matches) Object.assign(props, style);
    }

    return props;
  };
}
