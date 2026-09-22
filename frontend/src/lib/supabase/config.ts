export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Throws when the project variables are missing so a misconfigured deploy fails
 * closed instead of silently serving pages with no session.
 */
export function getSupabaseConfig(): SupabaseConfig {
  if (!isSupabaseConfigured) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を .env.local に設定してください。",
    );
  }
  return { url, anonKey };
}
