/**
 * Supabase Client Configuration for Apex LMS
 * Reads credentials configured via GitHub Repository Secrets in Vite build:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  )
};

/**
 * Returns true if Supabase production backend is configured.
 */
export function hasSupabaseCredentials(): boolean {
  return supabaseConfig.isConfigured;
}

export default supabaseConfig;
