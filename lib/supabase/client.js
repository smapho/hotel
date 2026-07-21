import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY はサーバー側(APIルート/プロバイダ)からのみ使用する。
// 未設定の場合はnullを返し、呼び出し側はキャッシュ無しで動作を継続する。
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  if (!cachedClient) {
    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return cachedClient;
}
