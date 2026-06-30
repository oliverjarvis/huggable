<div align="center">
  <img src="assets/huggable-header.png" alt="Huggable — Hugs for every moment" width="100%" />
</div>

# Huggable

> Deterministic design-system plugin: create, follow, and migrate-to design systems for React + React Native.

Huggable is an installable Claude Code plugin that helps Claude **deterministically** produce
beautiful, coherent, distinctive UI for **React (web)** and **React Native** — and **systematically
migrate** existing codebases onto a design system, without every screen turning into a one-off
custom component.

## Why

AI-generated UI tends to converge on a recognizable "slop" aesthetic (Inter fonts, purple-on-white
gradients, minimal motion). A token registry alone raises fidelity but does **not** guarantee
determinism. Huggable's answer: **determinism comes from a deterministic enforcement layer
(lint + codegen + audit), not from prompting alone.** Prompting and skills steer taste; lint
enforces the floor.

## What it does

1. **Create** coherent, distinctive design systems and components on demand. New components adhere
   to the system *by construction* and are hierarchical (higher-order components built from
   lower-order primitives).
2. **Migrate** an existing codebase onto the system — discovering needed components and designing
   them on the fly — incrementally and verifiably.

## Architecture

| Layer | Lives where | What it is |
|---|---|---|
| **The plugin** (shared, installed once) | `~/.claude/plugins/huggable` | Skills + scripts + ESLint plugin + design-knowledge base. The only shared artifact. |
| **Design-system instance** (per-app, owned) | each app repo, e.g. `app/src/design/` | `tokens.ts` source, generated theme, owned components, `registry.json`. You own and edit it. |
| **The app** | app screens/features | Consumes its own design system. |

The plugin **never ships components** — it ships the ability to generate, extend, and migrate them
into an app (shadcn philosophy end-to-end).

## Status

Early development (`v0.1`). See [`docs/superpowers`](docs/superpowers) for the design spec and
implementation plans.
