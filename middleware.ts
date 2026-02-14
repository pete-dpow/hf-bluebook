// middleware.ts — Env validation + rate limiting for API routes

import { NextRequest, NextResponse } from "next/server";

// ── Env validation (runs once per cold start) ────────────────

let envChecked = false;
let envWarnings: string[] = [];

function checkEnv(): string[] {
  if (envChecked) return envWarnings;

  const checks: { name: string; placeholder?: string; required: boolean }[] = [
    { name: "SUPABASE_SERVICE_ROLE_KEY", placeholder: "build-placeholder", required: true },
    { name: "NEXT_PUBLIC_SUPABASE_URL", required: true },
    { name: "OPENAI_API_KEY", placeholder: "sk-placeholder", required: true },
    { name: "ANTHROPIC_API_KEY", placeholder: "sk-ant-placeholder", required: true },
  ];

  envWarnings = [];
  for (const c of checks) {
    const val = process.env[c.name];
    if (!val) {
      if (c.required) envWarnings.push(`ENV MISSING: ${c.name}`);
    } else if (c.placeholder && val === c.placeholder) {
      envWarnings.push(`ENV PLACEHOLDER: ${c.name} is still "${c.placeholder}"`);
    }
  }

  if (envWarnings.length > 0 && process.env.NODE_ENV === "production") {
    console.error("[middleware] Environment variable issues detected:", envWarnings);
  }

  envChecked = true;
  return envWarnings;
}

// ── Rate limiting (in-memory sliding window) ─────────────────

interface RateBucket {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateBucket>();
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

// Limits per route pattern (requests per minute)
const RATE_LIMITS: { pattern: RegExp; limit: number }[] = [
  { pattern: /^\/api\/(hybrid-chat|chat)/, limit: 20 },
  { pattern: /^\/api\/autoplan\/plans\/[^/]+\/export/, limit: 10 },
  { pattern: /^\/api\/summary-report/, limit: 10 },
  { pattern: /^\/api\/(products\/search|bluebook\/search|compliance\/search)/, limit: 30 },
  { pattern: /^\/api\//, limit: 60 },
];

function getRateLimit(pathname: string): number {
  for (const r of RATE_LIMITS) {
    if (r.pattern.test(pathname)) return r.limit;
  }
  return 60;
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter?: number } {
  const limit = getRateLimit(pathname);
  const key = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;
  const now = Date.now();
  const windowMs = 60_000;

  // Periodic cleanup of stale entries
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    const cutoff = now - windowMs;
    Array.from(rateLimitMap.entries()).forEach(([k, bucket]) => {
      bucket.timestamps = bucket.timestamps.filter((t: number) => t > cutoff);
      if (bucket.timestamps.length === 0) rateLimitMap.delete(k);
    });
    lastCleanup = now;
  }

  let bucket = rateLimitMap.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitMap.set(key, bucket);
  }

  // Remove timestamps outside the window
  const cutoff = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t: number) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  bucket.timestamps.push(now);
  return { allowed: true };
}

// ── Middleware entry point ────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip webhook endpoints (they have their own auth: Inngest, Stripe, Twilio)
  if (
    pathname === "/api/inngest" ||
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/whatsapp/webhook"
  ) {
    return NextResponse.next();
  }

  // Env validation (first request only)
  const warnings = checkEnv();
  if (warnings.length > 0 && process.env.NODE_ENV === "production") {
    // In production, block requests if critical env vars are missing
    const missing = warnings.filter((w) => w.startsWith("ENV MISSING:"));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Server configuration error. Contact administrator." },
        { status: 500 }
      );
    }
  }

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, retryAfter } = checkRateLimit(ip, pathname);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
