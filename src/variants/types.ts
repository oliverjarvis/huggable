/** Style object: values are token KEYS (strings, e.g. bg: "surface.card") or raw pass-through values for non-tokenized props (numbers/booleans, e.g. opacity: 0.5, flex: 1). */
export type StyleProps = Record<string, string | number | boolean>;

/** variant group name -> variant value -> styles, e.g. { size: { sm: {...}, md: {...} } } */
export type VariantGroups = Record<string, Record<string, StyleProps>>;

export type VariantSelection = Record<string, string | boolean>;

export interface VariantConfig {
  base?: StyleProps;
  variants?: VariantGroups;
  defaultVariants?: Record<string, string | boolean>;
  /** each entry: variant conditions + the styles to apply when ALL match */
  compoundVariants?: Array<Record<string, string | boolean | StyleProps> & { style: StyleProps }>;
}
