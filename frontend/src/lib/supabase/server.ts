import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export async function getSupabaseServerClient() {
  const { url, anonKey } = getSupabaseConfig();
  const store = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (entries) => {
        try {
          for (const { name, value, options } of entries) {
            store.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The middleware refreshes them instead.
        }
      },
    },
  });
}
