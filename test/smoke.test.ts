import { describe, it, expect } from "vitest";
import { HUGGABLE_VERSION } from "../src/index.js";

describe("smoke", () => {
  it("exposes a version", () => {
    expect(HUGGABLE_VERSION).toBe("0.1.0");
  });
});
