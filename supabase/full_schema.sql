-- ============================================================================
-- FULL PRODUCTION SCHEMA & SEED FOR SUPABASE
-- Run this complete script in your Supabase SQL Editor
-- ============================================================================

-- 1. Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('employee', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('created', 'approved', 'rejected', 'cancelled', 'balance_adjusted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    department TEXT,
    designation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Leave Types Table
CREATE TABLE IF NOT EXISTS public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    default_days_per_year NUMERIC(5, 2) NOT NULL DEFAULT 12,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Leave Balances Table
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    allocated_days NUMERIC(5, 2) NOT NULL DEFAULT 0,
    used_days NUMERIC(5, 2) NOT NULL DEFAULT 0,
    pending_days NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT uq_user_leave_year UNIQUE(user_id, leave_type_id, year),
    CONSTRAINT chk_allocated_non_negative CHECK (allocated_days >= 0),
    CONSTRAINT chk_used_non_negative CHECK (used_days >= 0),
    CONSTRAINT chk_pending_non_negative CHECK (pending_days >= 0)
);

-- 5. Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(5, 2) NOT NULL,
    reason TEXT NOT NULL,
    status leave_status NOT NULL DEFAULT 'pending',
    admin_comment TEXT,
    actioned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT chk_positive_days CHECK (total_days > 0)
);

-- 6. Leave Audit Logs Table
CREATE TABLE IF NOT EXISTS public.leave_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE CASCADE,
    action audit_action NOT NULL,
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_status leave_status,
    new_status leave_status,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON public.leave_balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON public.leave_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_audit_request ON public.leave_audit_logs(leave_request_id);

-- 8. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (public.is_admin() OR (role = (SELECT role FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "leave_types_select_policy" ON public.leave_types;
CREATE POLICY "leave_types_select_policy" ON public.leave_types FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "leave_types_admin_all" ON public.leave_types;
CREATE POLICY "leave_types_admin_all" ON public.leave_types FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "leave_balances_select_policy" ON public.leave_balances;
CREATE POLICY "leave_balances_select_policy" ON public.leave_balances FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "leave_balances_admin_mutation" ON public.leave_balances;
CREATE POLICY "leave_balances_admin_mutation" ON public.leave_balances FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_select_policy" ON public.leave_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "leave_requests_insert_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_insert_policy" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "leave_requests_update_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_update_policy" ON public.leave_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (public.is_admin() OR (user_id = auth.uid() AND status = 'cancelled'));

DROP POLICY IF EXISTS "leave_audit_logs_select_policy" ON public.leave_audit_logs;
CREATE POLICY "leave_audit_logs_select_policy" ON public.leave_audit_logs FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.leave_requests lr
    WHERE lr.id = leave_audit_logs.leave_request_id AND lr.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "leave_audit_logs_insert_policy" ON public.leave_audit_logs;
CREATE POLICY "leave_audit_logs_insert_policy" ON public.leave_audit_logs FOR INSERT TO authenticated
WITH CHECK (performed_by = auth.uid() OR public.is_admin());

-- 9. Trigger for New User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    cur_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    lt_record RECORD;
BEGIN
    INSERT INTO public.profiles (
        id, email, full_name, role, department, designation
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'employee',
        COALESCE(NEW.raw_user_meta_data->>'department', 'General'),
        COALESCE(NEW.raw_user_meta_data->>'designation', 'Staff')
    ) ON CONFLICT (id) DO NOTHING;

    FOR lt_record IN SELECT id, default_days_per_year FROM public.leave_types WHERE is_active = true LOOP
        INSERT INTO public.leave_balances (
            user_id, leave_type_id, year, allocated_days, used_days, pending_days
        ) VALUES (
            NEW.id, lt_record.id, cur_year, lt_record.default_days_per_year, 0, 0
        ) ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Atomic Apply for Leave
CREATE OR REPLACE FUNCTION public.apply_for_leave(
    p_user_id UUID,
    p_leave_type_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_total_days NUMERIC,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM p_start_date);
    v_balance_id UUID;
    v_allocated NUMERIC;
    v_used NUMERIC;
    v_pending NUMERIC;
    v_available NUMERIC;
    v_leave_code TEXT;
    v_new_request_id UUID;
    v_conflict_count INTEGER;
BEGIN
    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION 'End date cannot be prior to start date';
    END IF;

    IF p_total_days <= 0 THEN
        RAISE EXCEPTION 'Total days must be greater than zero';
    END IF;

    -- Overlap Check
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.leave_requests
    WHERE user_id = p_user_id
      AND status IN ('pending', 'approved')
      AND (
          (start_date <= p_end_date AND end_date >= p_start_date)
      );

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'You already have an active or pending leave request overlapping with the selected dates.';
    END IF;

    -- Check Leave Type
    SELECT code INTO v_leave_code
    FROM public.leave_types
    WHERE id = p_leave_type_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid leave type specified';
    END IF;

    -- Check Balance
    SELECT id, allocated_days, used_days, pending_days
    INTO v_balance_id, v_allocated, v_used, v_pending
    FROM public.leave_balances
    WHERE user_id = p_user_id
      AND leave_type_id = p_leave_type_id
      AND year = v_year
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.leave_balances (user_id, leave_type_id, year, allocated_days, used_days, pending_days)
        SELECT p_user_id, p_leave_type_id, v_year, default_days_per_year, 0, 0
        FROM public.leave_types WHERE id = p_leave_type_id
        RETURNING id, allocated_days, used_days, pending_days
        INTO v_balance_id, v_allocated, v_used, v_pending;
    END IF;

    IF v_leave_code <> 'UL' THEN
        v_available := v_allocated - (v_used + v_pending);
        IF p_total_days > v_available THEN
            RAISE EXCEPTION 'Insufficient leave balance. Requested: % days, Available: % days.', p_total_days, v_available;
        END IF;
    END IF;

    -- Insert Request
    INSERT INTO public.leave_requests (
        user_id, leave_type_id, start_date, end_date, total_days, reason, status
    ) VALUES (
        p_user_id, p_leave_type_id, p_start_date, p_end_date, p_total_days, p_reason, 'pending'
    ) RETURNING id INTO v_new_request_id;

    -- Update Balance
    UPDATE public.leave_balances
    SET pending_days = pending_days + p_total_days,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_balance_id;

    -- Audit Log
    INSERT INTO public.leave_audit_logs (
        leave_request_id, action, performed_by, new_status, notes
    ) VALUES (
        v_new_request_id, 'created', p_user_id, 'pending', 'Leave request submitted by employee.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_request_id,
        'message', 'Leave application submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Atomic Process Leave Action (Approve / Reject)
CREATE OR REPLACE FUNCTION public.process_leave_action(
    p_request_id UUID,
    p_admin_id UUID,
    p_action leave_status,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_balance_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can approve or reject leave requests.';
    END IF;

    IF p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status action. Must be either approved or rejected.';
    END IF;

    IF p_action = 'rejected' AND (p_comment IS NULL OR trim(p_comment) = '') THEN
        RAISE EXCEPTION 'A rejection reason is mandatory when rejecting a leave request.';
    END IF;

    SELECT * INTO v_req
    FROM public.leave_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request not found';
    END IF;

    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'Request has already been processed with status: %', v_req.status;
    END IF;

    SELECT id INTO v_balance_id
    FROM public.leave_balances
    WHERE user_id = v_req.user_id
      AND leave_type_id = v_req.leave_type_id
      AND year = EXTRACT(YEAR FROM v_req.start_date)
    FOR UPDATE;

    IF v_balance_id IS NOT NULL THEN
        IF p_action = 'approved' THEN
            UPDATE public.leave_balances
            SET pending_days = GREATEST(0, pending_days - v_req.total_days),
                used_days = used_days + v_req.total_days,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_balance_id;
        ELSIF p_action = 'rejected' THEN
            UPDATE public.leave_balances
            SET pending_days = GREATEST(0, pending_days - v_req.total_days),
                updated_at = timezone('utc'::text, now())
            WHERE id = v_balance_id;
        END IF;
    END IF;

    UPDATE public.leave_requests
    SET status = p_action,
        admin_comment = p_comment,
        actioned_by = p_admin_id,
        actioned_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    INSERT INTO public.leave_audit_logs (
        leave_request_id, action, performed_by, old_status, new_status, notes
    ) VALUES (
        p_request_id,
        CASE WHEN p_action = 'approved' THEN 'approved'::audit_action ELSE 'rejected'::audit_action END,
        p_admin_id,
        'pending',
        p_action,
        COALESCE(p_comment, 'Status updated by administrator.')
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', p_action,
        'message', format('Leave request successfully %s', p_action)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Seed Default Leave Types
INSERT INTO public.leave_types (name, code, description, default_days_per_year, is_active)
VALUES
    ('Casual Leave', 'CL', 'Short-term personal time off for personal errands and unexpected events.', 12, true),
    ('Sick Leave', 'SL', 'Medical leave for illness, medical appointments, and recovery.', 10, true),
    ('Annual Leave', 'AL', 'Planned vacation time and earned paid time off.', 15, true),
    ('Unpaid Leave', 'UL', 'Extended absence without pay, subject to management approval.', 0, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_days_per_year = EXCLUDED.default_days_per_year,
    is_active = EXCLUDED.is_active;
