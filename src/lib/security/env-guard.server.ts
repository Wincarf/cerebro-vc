// Boot-time environment safety checks. Import once from server entry points
// (server functions / server routes) — never from client code.

import { safeError, safeLog } from "./redact";

const CLIENT_SAFE_VITE = new Set([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PROJECT_ID",
]);

const SECRET_SHAPES = [
  /^sk-[A-Za-z0-9_-]{20,}/,
  /^sb_secret_/,
  /service[_-]?role/i,
  /^ghp_/,
  /^tvly-/,
];

function looksSecret(value: string): boolean {
  if (!value || value.length < 24) return false;
  return SECRET_SHAPES.some((re) => re.test(value));
}

let checked = false;

/**
 * Fails fast if a secret-shaped value leaked into a VITE_* variable
 * (which would be baked into the client bundle). Idempotent.
 */
export function assertEnvHygiene(): void {
  if (checked) return;
  checked = true;

  const bad: string[] = [];
  const env = (typeof process !== "undefined" && process.env) || {};
  for (const [k, v] of Object.entries(env)) {
    if (!k.startsWith("VITE_")) continue;
    if (CLIENT_SAFE_VITE.has(k)) continue;
    if (typeof v === "string" && looksSecret(v)) bad.push(k);
  }
  if (bad.length) {
    const msg = `Refusing to boot: secret-shaped values found in client-visible VITE_* variables: ${bad.join(", ")}`;
    safeError("env-guard", msg);
    throw new Error(msg);
  }
  safeLog("env-guard", { ok: true, scope: "server" });
}