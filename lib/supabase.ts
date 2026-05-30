import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let browserClient: SupabaseClient | null = null;

/** Browser/client-side Supabase client (anon key). */
export function getSupabaseBrowser(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase public env vars are not configured");
  }
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return browserClient;
}

let serverClient: SupabaseClient | null = null;

/** Server-side Supabase client (service role — bypasses RLS). Use only in route handlers. */
export function getSupabaseServer(): SupabaseClient {
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error("No Supabase key configured");
  }
  if (!serverClient) {
    serverClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}
