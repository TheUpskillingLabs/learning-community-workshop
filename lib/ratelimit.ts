import "server-only";

// Lightweight in-memory fixed-window rate limiter. This is a per-instance
// backstop only — serverless functions don't share memory, so it does not
// stop a determined attacker. For a hardened backstop add Vercel WAF /
// @vercel/firewall checkRateLimit on the write routes (see README). Tune the
// limit generously: ~150 attendees behind shared wifi share NAT public IPs, so
// an IP limit set too low will punish honest people on the same network.

type Window = { count: number; resetAt: number };
const buckets = new Map<string, Window>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (existing.count < limit) {
    existing.count += 1;
    return { ok: true, retryAfterSec: 0 };
  }
  return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
