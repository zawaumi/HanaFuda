import { isAuthEnabled, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The backend verifies this token against Supabase Auth and derives the user id
 * from it (backend/auth.py, backend/api/dependencies.py). With AUTH_MODE=jwt a
 * request without it is rejected with 401; with AUTH_MODE=legacy the backend
 * falls back to DEFAULT_USER_ID, which is what the local no-auth demo relies on.
 */
export async function getAuthorizationHeader(): Promise<string | undefined> {
  if (typeof window === "undefined" || !isAuthEnabled || !isSupabaseConfigured) {
    return undefined;
  }

  const { getSupabaseBrowserClient } = await import("@/lib/supabase/browser");
  // getSession refreshes an expired access token before returning it.
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : undefined;
}
