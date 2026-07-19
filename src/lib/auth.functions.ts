import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { throwSanitized } from "./security/redact";

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(6).max(200),
});

// Auto-confirms email so the demo works regardless of the "Confirm email"
// Supabase dashboard setting. Uses admin API server-side only.
export const demoSignup = createServerFn({ method: "POST" })
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        // Do not disclose account existence. Return the same shape as a fresh signup.
        return { ok: true as const };
      }
      throwSanitized(error, "demoSignup");
    }
    return { ok: true as const };
  });