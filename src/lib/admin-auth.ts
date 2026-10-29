import { timingSafeEqual } from "node:crypto";

/** Bearer-token check for moderation endpoints. Disabled entirely when ADMIN_TOKEN is unset. */
export function isAdmin(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
