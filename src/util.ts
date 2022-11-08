import cl from "cli-color";

/**
 * Create enum
 * @template {string} T
 * @param {T[]} values
 * @returns {{[K in T]: number}}
 */
export function Enum(...values) {
  const obj = {};

  let i = 0;
  for (const value of values) {
    obj[i] = value;
    obj[value] = i++;
  }

  return obj;
}

// for error formatter
export function hsv2rgb(h, s, v) {
  (s = s / 100), (v = v / 100);
  let f = (n, k = (n + h / 60) % 6) =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5), f(3), f(1)].map((x) => ~~(x * 255));
}

export function rgb(r, g, b) {
  return cl.xtermSupported
    ? (text) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`
    : (text) => text;
}
