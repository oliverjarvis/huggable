import type { TokenSource } from "../../src/tokens/types.js";

const space = { "0": 0, "1": 2, "2": 4, "3": 8, "4": 12, "5": 16, "6": 24, "7": 32, "8": 40, "9": 48, "10": 64, "11": 80, "12": 96, "13": 160 };

export const exampleTokens: TokenSource = {
  primitive: {
    color: {
      ink900: "#10100F", ink600: "#4A4A46", paper50: "#FBF9F4", paper100: "#F1ECE1",
      clay500: "#C2410C", clay300: "#FB923C", sage700: "#3F5C4E", line200: "#E2DCCD",
      white: "#FFFFFF", black: "#000000",
    },
    space,
    radius: { none: 0, sm: 4, md: 8, lg: 16, xl: 24, full: 9999 },
    fontFamily: { display: "Clash Display", body: "Geist", mono: "Geist Mono" },
    fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, "2xl": 40, "3xl": 64 },
    lineHeight: { tight: 1.2, snug: 1.35, body: 1.6 },
    fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    zIndex: { base: 0, dropdown: 10, overlay: 100, toast: 1000 },
    duration: { fast: 120, base: 220, slow: 360 },
    easing: { standard: "cubic-bezier(0.2, 0, 0, 1)" },
  },
  themes: [
    {
      name: "light",
      semantic: {
        color: {
          "bg.canvas": "paper50", "bg.subtle": "paper100", "surface.card": "white",
          "text.body": "ink900", "text.muted": "ink600", "border.subtle": "line200",
          "accent.default": "clay500", "accent.text": "white",
        },
        text: {
          heading: { fontFamily: "display", fontSize: "2xl", lineHeight: "tight", fontWeight: "bold" },
          body: { fontFamily: "body", fontSize: "md", lineHeight: "body", fontWeight: "regular" },
          caption: { fontFamily: "body", fontSize: "sm", lineHeight: "snug", fontWeight: "medium" },
        },
      },
    },
    {
      name: "dark",
      semantic: {
        color: {
          "bg.canvas": "ink900", "bg.subtle": "ink600", "surface.card": "ink600",
          "text.body": "paper50", "text.muted": "paper100", "border.subtle": "ink600",
          "accent.default": "clay300", "accent.text": "ink900",
        },
        text: {
          heading: { fontFamily: "display", fontSize: "2xl", lineHeight: "tight", fontWeight: "bold" },
          body: { fontFamily: "body", fontSize: "md", lineHeight: "body", fontWeight: "regular" },
          caption: { fontFamily: "body", fontSize: "sm", lineHeight: "snug", fontWeight: "medium" },
        },
      },
    },
    {
      name: "brand",
      semantic: {
        color: {
          "bg.canvas": "sage700", "bg.subtle": "ink600", "surface.card": "paper50",
          "text.body": "paper50", "text.muted": "paper100", "border.subtle": "sage700",
          "accent.default": "clay500", "accent.text": "white",
        },
        text: {
          heading: { fontFamily: "display", fontSize: "2xl", lineHeight: "tight", fontWeight: "bold" },
          body: { fontFamily: "body", fontSize: "md", lineHeight: "body", fontWeight: "regular" },
          caption: { fontFamily: "body", fontSize: "sm", lineHeight: "snug", fontWeight: "medium" },
        },
      },
    },
  ],
};
