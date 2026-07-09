import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function deriveSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "[@repo/storage] Neither SUPABASE_URL nor DATABASE_URL is set in env",
    );
  }
  // DATABASE_URL: postgresql://...@db.<ref>.supabase.co:5432/postgres
  const match = dbUrl.match(/@db\.([^.]+)\.supabase\.co/);
  if (!match || !match[1]) {
    throw new Error(
      "[@repo/storage] Could not derive SUPABASE_URL from DATABASE_URL host",
    );
  }
  return `https://${match[1]}.supabase.co`;
}

export function serverClient(): SupabaseClient {
  if (cached) return cached;

  const url = deriveSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "[@repo/storage] SUPABASE_SERVICE_ROLE_KEY missing in env. Add it from Supabase Dashboard → Settings → API → service_role.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
