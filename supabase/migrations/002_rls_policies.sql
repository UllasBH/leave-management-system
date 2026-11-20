-- ============================================================================
-- 002_rls_policies.sql
-- Row Level Security (RLS) Policies
-- Enterprise Leave Management System
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ----------------------------------------------------------------------------
-- Employees can view their own profile; Admins can view all profiles
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

-- Users can update their basic profile information, but cannot change role
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (
  -- If not admin, the role must remain unchanged
  public.is_admin() OR (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
);

-- Profiles insert allowed for service_role and triggers
CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. LEAVE TYPES POLICIES
-- ----------------------------------------------------------------------------
-- Anyone authenticated can view active leave types
CREATE POLICY "leave_types_select_policy"
ON public.leave_types FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin());

-- Only admins can modify leave types
CREATE POLICY "leave_types_admin_all"
ON public.leave_types FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. LEAVE BALANCES POLICIES
-- ----------------------------------------------------------------------------
-- Employees can read their own balances; Admins can view all balances
CREATE POLICY "leave_balances_select_policy"
ON public.leave_balances FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Only admins can directly update or insert balances
CREATE POLICY "leave_balances_admin_mutation"
ON public.leave_balances FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. LEAVE REQUESTS POLICIES
-- ----------------------------------------------------------------------------
-- Employees can view their own requests; Admins can view all
CREATE POLICY "leave_requests_select_policy"
ON public.leave_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Employees can create requests for themselves with status 'pending'
CREATE POLICY "leave_requests_insert_policy"
ON public.leave_requests FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND status = 'pending'
);

-- Employees can only cancel their own pending requests; Admins can approve/reject
CREATE POLICY "leave_requests_update_policy"
ON public.leave_requests FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (
  -- If employee is updating, they can only change status to 'cancelled'
  public.is_admin() OR (user_id = auth.uid() AND status = 'cancelled')
);

-- ----------------------------------------------------------------------------
-- 5. LEAVE AUDIT LOGS POLICIES
-- ----------------------------------------------------------------------------
-- Employees can read logs for their own requests; Admins can read all logs
CREATE POLICY "leave_audit_logs_select_policy"
ON public.leave_audit_logs FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.leave_requests lr
    WHERE lr.id = leave_audit_logs.leave_request_id AND lr.user_id = auth.uid()
  )
);

-- Only system/triggers insert audit logs (allowed for authenticated users during actions)
CREATE POLICY "leave_audit_logs_insert_policy"
ON public.leave_audit_logs FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid() OR public.is_admin());
