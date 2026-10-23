import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

/**
 * Audit Logging Helper (Login Prompt 5)
 * Logs every authentication attempt (success/failed) to login_audit_logs
 */
export async function logAuthEvent(params: {
  userId?: string | null;
  status: 'success' | 'failed';
  failureReason?: string | null;
  email?: string;
}): Promise<void> {
  try {
    const payload = {
      user_id: params.userId || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      status: params.status,
      failure_reason: params.failureReason || null,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      await supabase.from('login_audit_logs').insert([payload]);
    } else {
      // Local fallback for offline/demo auditing
      const localLogs = JSON.parse(localStorage.getItem('apex_audit_logs') || '[]');
      localLogs.unshift({ ...payload, id: `log-${Date.now()}`, email: params.email });
      localStorage.setItem('apex_audit_logs', JSON.stringify(localLogs.slice(0, 100)));
    }
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

export default supabase;
