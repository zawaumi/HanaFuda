"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
