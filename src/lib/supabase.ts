import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client (anon key).
 * Used for Auth operations (signUp, signInWithPassword) in API routes and NextAuth.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Service-role Supabase client — bypasses RLS. Use ONLY in server code that
 * needs to write to private buckets (e.g. body-scans). Never expose to the browser.
 *
 * Requires env: SUPABASE_SERVICE_ROLE_KEY
 */
let _serviceClient: SupabaseClient | null = null;
export function getSupabaseServiceClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local and Vercel env vars (server-only).",
    );
  }
  _serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _serviceClient;
}
