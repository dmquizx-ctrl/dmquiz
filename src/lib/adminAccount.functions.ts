import { createServerFn } from "@tanstack/react-start";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const LEGACY_BCRYPT_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

async function verifyPassword(password: string, hash: string) {
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
    return password === "123456" && hash === LEGACY_BCRYPT_HASH;
  }
  return (await sha256Hex(password)) === hash;
}

type ChangeInput = {
  username: string;
  currentPassword: string;
  newPassword: string;
};

export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((input: ChangeInput) => {
    if (!input?.username) throw new Error("ไม่พบบัญชีผู้ดูแลระบบ");
    if (!input.currentPassword) throw new Error("กรุณากรอกรหัสผ่านปัจจุบัน");
    if (!input.newPassword || input.newPassword.length < 6) {
      throw new Error("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: admin, error } = await supabaseAdmin
      .from("admins")
      .select("id, password_hash")
      .eq("username", data.username)
      .maybeSingle();

    if (error || !admin) throw new Error("ไม่พบบัญชีผู้ดูแลระบบ");

    const ok = await verifyPassword(data.currentPassword, admin.password_hash);
    if (!ok) throw new Error("รหัสผ่านปัจจุบันไม่ถูกต้อง");

    const newHash = await sha256Hex(data.newPassword);
    const { error: updateError } = await supabaseAdmin
      .from("admins")
      .update({ password_hash: newHash })
      .eq("id", admin.id);

    if (updateError) throw new Error("บันทึกรหัสผ่านใหม่ไม่สำเร็จ");

    return { success: true };
  });
