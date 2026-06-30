---
name: add-component
description: Use when a new UI component is needed, to create it so it adheres to the design system by construction (reuses lower-tier primitives, token-only styles, passes lint) instead of becoming a one-off.
---

# Add a component that adheres by construction

The rule that prevents every screen becoming custom: build the new component from existing lower-order ones; only create a new primitive on a real gap.

## 1. Resolve, don't reinvent
Query the component registry (`src/registry/build-registry.ts`) first. Resolve the request to the LOWEST tier that satisfies it, and compose from components that already exist. Create a new lower-tier primitive only if there is a genuine gap, then register it.

## 2. Token-only styles
Style exclusively through token props on the primitives (`<Box bg="surface.card" p="5" radius="md">`) — never raw hex/numbers. Express variants with `defineVariants` (`src/variants/define-variants.ts`): base + variant groups + defaults (+ compound/boolean), returning token-keyed style props.

## 3. Behavior
For accessible behavior, build on the headless layer (RN: @rn-primitives; web: Base UI). Own the styled component; depend only on the behavior.

## 4. Register + gate
Record the component's tier + dependencies in the registry. It is not "done" until `validateTierBoundaries` (`src/registry/validate-tiers.ts`) is clean and `huggable:audit` is green.

## Hierarchy
primitive (Box/Text/Stack/Pressable/Icon) < element (Button/Input/Badge…) < compound (Field/Card/Dialog…) < pattern (Form/Header/EmptyState…). A component imports only from strictly lower tiers.
