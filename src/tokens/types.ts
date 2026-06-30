export type Hex = `#${string}`;

export interface PrimitiveTokens {
  /** raw palette: name -> hex (e.g. blue500). Never used directly in components. */
  color: Record<string, Hex>;
  /** spacing ramp: key -> px. All values even; 0 allowed. */
  space: Record<string, number>;
  radius: Record<string, number>;
  fontFamily: { display: string; body: string; mono: string };
  fontSize: Record<string, number>;
  lineHeight: Record<string, number>;
  fontWeight: Record<string, number>;
  zIndex: Record<string, number>;
  duration: Record<string, number>;
  easing: Record<string, string>;
}

export interface TextVariant {
  /** key of primitive.fontFamily */
  fontFamily: keyof PrimitiveTokens["fontFamily"];
  /** key of primitive.fontSize */
  fontSize: string;
  /** key of primitive.lineHeight */
  lineHeight: string;
  /** key of primitive.fontWeight */
  fontWeight: string;
}

export interface SemanticTokens {
  /** purpose/role name -> primitive.color KEY (e.g. "bg.canvas" -> "slate900") */
  color: Record<string, string>;
  /** purpose/role name -> composite text variant */
  text: Record<string, TextVariant>;
}

export interface ThemeDef {
  name: string;
  semantic: SemanticTokens;
}

export interface TokenSource {
  primitive: PrimitiveTokens;
  /** first theme is the base/default */
  themes: ThemeDef[];
}
