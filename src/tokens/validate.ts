import type { TokenSource } from "./types.js";

const BANNED_FONTS = ["inter", "roboto", "arial", "open sans", "lato", "fraunces"];

export function validateTokenSource(src: TokenSource): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // banned fonts
  for (const [role, family] of Object.entries(src.primitive.fontFamily)) {
    if (BANNED_FONTS.includes(family.trim().toLowerCase())) {
      errors.push(`banned font: fontFamily.${role} = "${family}"`);
    }
  }

  // spacing must be even (0 allowed)
  for (const [key, val] of Object.entries(src.primitive.space)) {
    if (val !== 0 && val % 2 !== 0) {
      errors.push(`spacing values must be even (multiples of 2): space.${key} = ${val}`);
    }
  }

  // min font size warning
  for (const [key, val] of Object.entries(src.primitive.fontSize)) {
    if (val < 12) warnings.push(`fontSize.${key} = ${val} is below the 12px floor`);
  }

  // semantic refs must resolve
  const colorKeys = new Set(Object.keys(src.primitive.color));
  const familyKeys = new Set(Object.keys(src.primitive.fontFamily));
  const sizeKeys = new Set(Object.keys(src.primitive.fontSize));
  const lhKeys = new Set(Object.keys(src.primitive.lineHeight));
  const weightKeys = new Set(Object.keys(src.primitive.fontWeight));

  for (const theme of src.themes) {
    for (const [name, ref] of Object.entries(theme.semantic.color)) {
      if (!colorKeys.has(ref)) {
        errors.push(`[${theme.name}] unknown primitive color "${ref}" for semantic "${name}"`);
      }
    }
    for (const [name, tv] of Object.entries(theme.semantic.text)) {
      if (!familyKeys.has(tv.fontFamily)) errors.push(`[${theme.name}] text.${name}: unknown fontFamily "${tv.fontFamily}"`);
      if (!sizeKeys.has(tv.fontSize)) errors.push(`[${theme.name}] text.${name}: unknown fontSize "${tv.fontSize}"`);
      if (!lhKeys.has(tv.lineHeight)) errors.push(`[${theme.name}] text.${name}: unknown lineHeight "${tv.lineHeight}"`);
      if (!weightKeys.has(tv.fontWeight)) errors.push(`[${theme.name}] text.${name}: unknown fontWeight "${tv.fontWeight}"`);
    }
  }

  if (src.themes.length === 0) errors.push("token source has no themes");
  return { errors, warnings };
}
