// Server-side helpers to redact secret-shaped values from logs and error
// payloads before they reach the client or the console.
//
// Never import from client code — keep it in `.server.ts` graphs / server fns.

const SECRET_KEY_NAMES = /^(authorization|api[_-]?key|apikey|token|secret|password|service[_-]?role|jwks|cookie|set-cookie|refresh[_-]?token|access[_-]?token|bearer)$/i;

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,           // OpenAI
  /\bsb_secret_[A-Za-z0-9_-]{10,}\b/g,    // Supabase new-format secret
  /\bsb_publishable_[A-Za-z0-9_-]{10,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,            // GitHub personal
  /\bgho_[A-Za-z0-9]{20,}\b/g,
  /\bghs_[A-Za-z0-9]{20,}\b/g,
  /\btvly-[A-Za-z0-9_-]{10,}\b/g,         // Tavily
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, // JWT
  /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi,
];

const MAX_STRING = 2048;

function redactString(s: string): string {
  let out = s;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  if (out.length > MAX_STRING) out = out.slice(0, MAX_STRING) + "…[truncated]";
  return out;
}

export function redact<T>(value: T, seen = new WeakSet()): T {
  if (value == null) return value;
  if (typeof value === "string") return redactString(value) as unknown as T;
  if (typeof value !== "object") return value;
  if (seen.has(value as object)) return "[Circular]" as unknown as T;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, seen)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_NAMES.test(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    out[k] = redact(v, seen);
  }
  return out as unknown as T;
}

export function safeLog(scope: string, payload: unknown): void {
  try {
    // eslint-disable-next-line no-console
    console.log(`[${scope}]`, redact(payload));
  } catch {
    // never let logging throw
  }
}

export function safeError(scope: string, payload: unknown): void {
  try {
    // eslint-disable-next-line no-console
    console.error(`[${scope}]`, redact(payload));
  } catch {
    // never let logging throw
  }
}

export type SanitizedError = { message: string; code?: string };

/**
 * Turns any thrown value into a small, redacted object safe to return or
 * re-throw to the client. Strips stack traces, provider bodies, and secrets.
 */
export function sanitizeError(err: unknown): SanitizedError {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : (() => {
            try {
              return JSON.stringify(err);
            } catch {
              return String(err);
            }
          })();
  const message = redactString(raw).slice(0, 400) || "Internal error";
  const code = (err as any)?.code && typeof (err as any).code === "string" ? (err as any).code : undefined;
  return code ? { message, code } : { message };
}

/** Throw a sanitized Error — never leaks internals. */
export function throwSanitized(err: unknown, scope = "server"): never {
  const s = sanitizeError(err);
  safeError(scope, err);
  const e = new Error(s.message);
  if (s.code) (e as any).code = s.code;
  throw e;
}