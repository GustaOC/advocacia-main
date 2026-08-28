// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-url.supabase.co"
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key"
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== 'production') {
     console.warn("Missing Supabase envs: NEXT_PUBLIC_SUPABASE_URL");
  }
  
  return createBrowserClient(url, anon)
}
