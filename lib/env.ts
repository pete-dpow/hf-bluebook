// lib/env.ts — Runtime environment variable validation

interface EnvCheck {
  name: string;
  placeholder?: string;
  required: boolean;
}

const CRITICAL_VARS: EnvCheck[] = [
  { name: "SUPABASE_SERVICE_ROLE_KEY", placeholder: "build-placeholder", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
  { name: "OPENAI_API_KEY", placeholder: "sk-placeholder", required: true },
  { name: "ANTHROPIC_API_KEY", placeholder: "sk-ant-placeholder", required: true },
  { name: "INNGEST_EVENT_KEY", required: false },
  { name: "INNGEST_SIGNING_KEY", required: false },
  { name: "RESEND_API_KEY", required: false },
  { name: "STRIPE_SECRET_KEY", placeholder: "sk_placeholder", required: false },
];

let validated = false;
let warnings: string[] = [];

/**
 * Validates that critical environment variables are set and not still placeholder values.
 * Called once per cold start from middleware. Subsequent calls return cached result.
 * Returns array of warning messages (empty = all good).
 */
export function validateEnv(): string[] {
  if (validated) return warnings;

  warnings = [];

  for (const v of CRITICAL_VARS) {
    const val = process.env[v.name];

    if (!val) {
      if (v.required) {
        warnings.push(`MISSING: ${v.name} is not set`);
      }
      continue;
    }

    if (v.placeholder && val === v.placeholder) {
      warnings.push(`PLACEHOLDER: ${v.name} is still "${v.placeholder}"`);
    }
  }

  validated = true;
  return warnings;
}

/**
 * Returns true if env vars have been validated and all required vars are present.
 */
export function isEnvValid(): boolean {
  const w = validateEnv();
  return w.filter((m) => m.startsWith("MISSING:")).length === 0;
}
