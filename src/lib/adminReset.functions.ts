import { createServerFn } from "@tanstack/react-start";

// Temporary one-off helper: resets the admin password to 123456.
export const resetAdminPassword = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const bytes = new TextEncoder().encode("123456");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const { error } = await supabaseAdmin
      .from("admins")
      .update({ password_hash: hash })
      .eq("username", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  }
);
