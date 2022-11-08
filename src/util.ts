import { xtermSupported } from "cli-color";

export function hsv2rgb(h: number, s: number, v: number) {
  (s = s / 100), (v = v / 100);
  let f = (n: number, k = (n + h / 60) % 6) =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5), f(3), f(1)].map((x) => ~~(x * 255));
}

export function rgb(red: number, green: number, blue: number): (input: string) => string {
  return xtermSupported
    ? (text) => `\x1b[38;2;${red};${green};${blue}m${text}\x1b[0m`
    : (text) => text;
}
