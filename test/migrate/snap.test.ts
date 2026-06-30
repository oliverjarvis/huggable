import { describe, it, expect } from "vitest";
import { snapNumber, snapColor } from "../../src/migrate/snap.js";

const SPACE = { "0": 0, "3": 8, "4": 12, "5": 16, "6": 24 };
const PALETTE = { paper50: "#FBF9F4", ink900: "#10100F", clay500: "#C2410C" };

describe("snapNumber", () => {
  it("snaps within tolerance to the nearest token", () => {
    expect(snapNumber(13, SPACE)).toEqual({ status: "snapped", token: "4", distance: 1 });
  });
  it("snaps exact matches with distance 0", () => {
    expect(snapNumber(16, SPACE)).toEqual({ status: "snapped", token: "5", distance: 0 });
  });
  it("flags values outside tolerance", () => {
    expect(snapNumber(20, SPACE)).toEqual({ status: "flagged", nearest: "6", distance: 4 });
  });
});

describe("snapColor", () => {
  it("snaps a near-identical hex within tolerance", () => {
    expect(snapColor("#FBF9F5", PALETTE)).toMatchObject({ status: "snapped", token: "paper50" });
  });
  it("flags a color far from any token", () => {
    expect(snapColor("#00FF00", PALETTE)).toMatchObject({ status: "flagged" });
  });
  it("flags non-hex color functions", () => {
    expect(snapColor("rgb(0,0,0)", PALETTE)).toEqual({ status: "flagged", nearest: "", distance: Infinity });
  });
});
