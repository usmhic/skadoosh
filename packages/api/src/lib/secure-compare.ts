import { timingSafeEqual } from "node:crypto";

/** Constant-time string comparison for signatures and shared secrets. */
export function secureCompare(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
