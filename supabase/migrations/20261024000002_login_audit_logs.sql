-- ============================================================================
-- Supabase Migration: login_audit_logs Table & RPC Logging Helper
-- Enterprise Loan Management System (LMS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.login_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for security querying by user and timestamp
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_user_id ON public.login_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_created_at ON public.login_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_status ON public.login_audit_logs(status);

-- Enable RLS
ALTER TABLE public.login_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert by public/anon during login attempts
CREATE POLICY "Allow system insert to login_audit_logs"
  ON public.login_audit_logs FOR INSERT
  WITH CHECK (true);

-- Allow admins to view audit logs
CREATE POLICY "Admins can view login_audit_logs"
  ON public.login_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- RPC Function for logging
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id uuid,
  p_status text,
  p_failure_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.login_audit_logs (
    user_id,
    ip_address,
    user_agent,
    status,
    failure_reason,
    created_at
  )
  VALUES (
    p_user_id,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    p_status,
    p_failure_reason,
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
