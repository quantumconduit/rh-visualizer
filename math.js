// Prime list and zero heights (from your original code)
export const primes = [
  2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,
  73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,
  151,157,163,167,173,179,181,191,193,197,199,211,223,227,229
];

export const zeroHeights = [
  14.1347, 21.0220, 25.0109, 30.4249, 32.9351,
  37.5862, 40.9187, 43.3271, 48.0052, 49.7738,
  52.9703, 56.4462, 59.3470, 60.8318, 65.1125,
  67.0798, 69.5464, 72.0672, 75.7047, 77.1448,
  79.3374, 82.9104, 84.7355, 87.4253, 88.8091,
  92.4913, 94.6513, 95.8706, 98.8312, 101.3179
];

// Same HSL→RGB helper as your original code
export function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r, g, b];
}

// Hybrid "zeta amplitude": keeps your placeholder but lets us modulate by t
export function zetaAmplitude(re, im, t) {
  const eps = 1e-3;
  const scale = 1 + 0.2 * Math.sin(t * 0.5);
  const denom = re + im * eps * Math.sin(im / 10);
  const base = 1 / Math.max(0.0001, Math.abs(denom));
  return base * scale;
}

// Quantum-oscillator style height field for the hybrid surface
export function oscillatorHeight(x, y, time) {
  const kx = 0.3;
  const ky = 0.12;
  const n = 3.0;
  const m = 2.0;
  const phase = time * 0.6;

  const hx = Math.sin(n * kx * x + phase);
  const hy = Math.cos(m * ky * y - phase * 0.7);

  return 1.4 * hx * hy;
}

// Contraction factor that squeezes Re(s) towards 0.5
export function contractionFactor(t) {
  // t in [0,1] roughly; 0 = wide, 1 = fully collapsed
  const clampT = Math.max(0, Math.min(1, t));
  return 1.0 - 0.85 * clampT; // at t=1, only 15% width remains
}
