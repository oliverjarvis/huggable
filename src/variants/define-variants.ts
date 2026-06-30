import type { VariantConfig, VariantSelection, StyleProps } from "./types.js";

export function defineVariants(config: VariantConfig): (selected?: VariantSelection) => StyleProps {
  const { base = {}, variants = {}, defaultVariants = {} } = config;

  return function resolve(selected: VariantSelection = {}): StyleProps {
    const props: StyleProps = { ...base };

    for (const group of Object.keys(variants)) {
      const chosen = selected[group] ?? defaultVariants[group];
      if (chosen === undefined) continue;
      const styles = variants[group]?.[String(chosen)];
      if (styles) Object.assign(props, styles);
    }

    return props;
  };
}
