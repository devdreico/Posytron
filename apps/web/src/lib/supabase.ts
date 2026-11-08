import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isCloud = Boolean(url && anon);

export const supabase: SupabaseClient | null = isCloud
  ? createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function cloudMode(): "cloud" | "local" {
  return isCloud ? "cloud" : "local";
}
