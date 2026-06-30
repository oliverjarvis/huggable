/** A token-keyed style object, e.g. { bg: "surface.card", px: "5" }. */
export type StyleProps = Record<string, string>;

/** variant group name -> variant value -> styles, e.g. { size: { sm: {...}, md: {...} } } */
export type VariantGroups = Record<string, Record<string, StyleProps>>;

export type VariantSelection = Record<string, string | boolean>;

export interface VariantConfig {
  base?: StyleProps;
  variants?: VariantGroups;
  defaultVariants?: Record<string, string | boolean>;
  /** each entry: variant conditions + the styles to apply when ALL match */
  compoundVariants?: Array<Record<string, string | boolean> & { style: StyleProps }>;
}
