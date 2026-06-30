export type SnapResult =
  | { status: "snapped"; token: string; distance: number }
  | { status: "flagged"; nearest: string; distance: number };

export function snapNumber(value: number, scale: Record<string, number>, tolerance = 2): SnapResult {
  let best = "";
  let bestDist = Infinity;
  for (const [token, v] of Object.entries(scale)) {
    const d = Math.abs(v - value);
    if (d <= bestDist) {
      bestDist = d;
      best = token;
    }
  }
  return bestDist <= tolerance
    ? { status: "snapped", token: best, distance: bestDist }
    : { status: "flagged", nearest: best, distance: bestDist };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) {
    const short = /^#([0-9a-fA-F]{3})$/.exec(hex.trim());
    if (!short) return null;
    const [r, g, b] = short[1].split("");
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  const n = m[1];
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export function snapColor(hex: string, palette: Record<string, string>, tolerance = 12): SnapResult {
  const rgb = hexToRgb(hex);
  if (!rgb) return { status: "flagged", nearest: "", distance: Infinity };
  let best = "";
  let bestDist = Infinity;
  for (const [token, value] of Object.entries(palette)) {
    const prgb = hexToRgb(value);
    if (!prgb) continue;
    const d = Math.sqrt((rgb[0] - prgb[0]) ** 2 + (rgb[1] - prgb[1]) ** 2 + (rgb[2] - prgb[2]) ** 2);
    if (d <= bestDist) {
      bestDist = d;
      best = token;
    }
  }
  return bestDist <= tolerance
    ? { status: "snapped", token: best, distance: bestDist }
    : { status: "flagged", nearest: best, distance: bestDist };
}
