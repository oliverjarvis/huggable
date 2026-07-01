---
name: establish
description: Use when creating a new Huggable design system for an app or brief (greenfield, or seeding from an existing app's values). Produces a coherent, distinctive token system and seeds primitives, not a generic default.
---

# Establish a design system

You are setting up a per-app, owned design system. Coherence comes from a fixed structure; distinctiveness comes from the values you choose. Do both.

## 1. Pin the brief
Name the subject, audience, and the product's single job. If the brief is vague, pin it yourself and state your choice. Use any memory of the human's preferences.

## 2. Get aesthetic direction (do not skip)
Invoke the `frontend-design` skill for taste: the distinctive display+body type pairing, a dominant+accent palette, radius/motion personality, and the one signature element. Huggable adds structure; `frontend-design` provides the point of view.

## 3. Vocalize the system BEFORE writing code
State, in prose: 4-6 named hex colors, the display/body/mono typefaces, the spacing/type/radius personality, the motion budget, and the signature element. Then self-critique against the anti-slop list below and revise anything that reads as a default; say what you changed and why.

## 4. Write the token source
Author `tokens.ts` as a two-tier `TokenSource` (see the type at `src/tokens/types.ts`): Tier-1 primitives (raw palette incl. oklch-extended shades, the Carbon-style even spacing ramp, radii, type scale, font families; never a banned font) and Tier-2 semantic maps with purpose/role names. Colors like `bg.canvas`, `surface.card`, `accent.default` go in `semantic.color`; text roles like `body`/`heading`/`caption` go in `semantic.text`. Ship light + dark (and a brand variant) as semantic maps over the same primitives.

## 5. Generate + seed
Run the codegen CLI at `src/cli/tokens-codegen.ts` (`--in tokens.ts --out-dir <app>/src/design --target rn|web|both`) to emit the Restyle theme (RN) and StyleX vars (web). The codegen reads `export const tokens` (or a default export) from `tokens.ts`. Seed the Tier-1 primitives (Box/Text/Stack/Pressable/Icon) on the generated theme. Build variants with the `defineVariants` helper at `src/variants/define-variants.ts`. Register components via `src/registry/build-registry.ts`.

## 6. Critique
Run `huggable:audit`. Nothing is "done" until lint is green and the visual critique passes.

## Anti-slop (mechanical goes to lint; judgment lives here)
Avoid: containers with rounded corners + left-border accent only; bluish-purple gradients; emoji-as-icon; hand-drawn SVG imagery; the fonts Inter/Roboto/Arial/Open Sans/Lato/Fraunces; "data slop" (unneeded numbers/stats). In copy, avoid Claude's tells: "It's not X, it's Y", verdict titles, "the magic moment". Spend boldness in ONE place; keep the rest quiet.
