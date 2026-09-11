import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
export const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const PHOTO_BUCKET = "love-photos";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!hasSupabaseConfig) {
    throw new Error("Supabase 尚未配置");
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

export async function ensureAnonymousSession(): Promise<string> {
  const supabase = getSupabase();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (session?.user.id) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user?.id) throw new Error("无法创建匿名身份");

  return data.user.id;
}
