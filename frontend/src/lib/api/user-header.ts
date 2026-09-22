import { isAuthEnabled, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * SECURITY: the FastAPI backend trusts `X-User-Id` as-is — it does not verify a
 * Supabase JWT, and its CORS config does not allow an `Authorization` header
 * (backend/main.py, backend/api/dependencies.py). Anyone can therefore put another
 * account's UUID here and read or write that account's data.
 *
 * This is a temporary bridge so the signed-in user reaches the existing API at all.
 * It must be replaced by a bearer token once the backend verifies one.
 * See frontend/docs/auth.md.
 */
export async function getUserIdHeader(): Promise<string | undefined> {
  // With auth off the header is omitted, so the backend falls back to DEFAULT_USER_ID.
  if (typeof window === "undefined" || !isAuthEnabled || !isSupabaseConfigured) {
    return undefined;
  }

  const { getSupabaseBrowserClient } = await import("@/lib/supabase/browser");
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return data.session?.user.id;
}
