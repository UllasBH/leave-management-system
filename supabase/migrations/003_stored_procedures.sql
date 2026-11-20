-- ============================================================================
-- 003_stored_procedures.sql
-- PL/pgSQL Atomic Functions, Triggers, and Stored Procedures (Security Hardened)
-- Enterprise Leave Management System
-- ============================================================================

-- Remove legacy caller-controlled overloads before defining hardened RPCs.
DROP FUNCTION IF EXISTS public.apply_for_leave(
    UUID, UUID, DATE, DATE, NUMERIC, TEXT
);
DROP FUNCTION IF EXISTS public.apply_for_leave(
    UUID, DATE, DATE, NUMERIC, TEXT
);
DROP FUNCTION IF EXISTS public.process_leave_action(
    UUID, UUID, leave_status, TEXT
);

-- ----------------------------------------------------------------------------
-- 1. Helper Function: is_admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 2. Automatic User Profile & Leave Balance Initialization Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    cur_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    lt_record RECORD;
BEGIN
    -- 1. Insert Profile (Always default to 'employee' for security)
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        department,
        designation
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'employee',
        COALESCE(NEW.raw_user_meta_data->>'department', 'General'),
        COALESCE(NEW.raw_user_meta_data->>'designation', 'Staff')
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Seed initial leave balances for all active leave types
    FOR lt_record IN SELECT id, default_days_per_year FROM public.leave_types WHERE is_active = true LOOP
        INSERT INTO public.leave_balances (
            user_id,
            leave_type_id,
            year,
            allocated_days,
            used_days,
            pending_days
        ) VALUES (
            NEW.id,
            lt_record.id,
            cur_year,
            lt_record.default_days_per_year,
            0,
            0
        ) ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 3. Atomic Leave Application Procedure (Enforces auth.uid() to eliminate IDOR)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_working_days(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_days BIGINT;
    v_full_weeks BIGINT;
    v_remaining_days INTEGER;
BEGIN
    IF p_end_date < p_start_date THEN
        RETURN 0;
    END IF;

    v_days := p_end_date - p_start_date + 1;
    v_full_weeks := v_days / 7;
    v_remaining_days := (v_days % 7)::INTEGER;

    RETURN (v_full_weeks * 5 + (
        SELECT pg_catalog.count(*)::INTEGER
        FROM pg_catalog.generate_series(0, v_remaining_days - 1) AS remaining(day_offset)
        WHERE EXTRACT(ISODOW FROM (p_start_date + remaining.day_offset)) BETWEEN 1 AND 5
    ))::INTEGER;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_working_days(DATE, DATE) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_for_leave(
    p_leave_type_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_year INTEGER;
    v_total_days INTEGER;
    v_balance_id UUID;
    v_allocated NUMERIC;
    v_used NUMERIC;
    v_pending NUMERIC;
    v_available NUMERIC;
    v_leave_code TEXT;
    v_new_request_id UUID;
    v_conflict_count INTEGER;
BEGIN
    -- 1. Authentication check
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to apply for leave';
    END IF;

    IF p_leave_type_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
        RAISE EXCEPTION 'Leave type, start date, and end date are required';
    END IF;

    -- 2. Validate date logic (no past dates, end >= start)
    IF p_start_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot apply for leave on past dates';
    END IF;

    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION 'End date cannot be prior to start date';
    END IF;

    IF EXTRACT(YEAR FROM p_start_date) <> EXTRACT(YEAR FROM p_end_date) THEN
        RAISE EXCEPTION 'Leave requests cannot cross calendar years';
    END IF;

    v_total_days := public.calculate_working_days(p_start_date, p_end_date);
    IF v_total_days <= 0 THEN
        RAISE EXCEPTION 'Selected date range contains no working days';
    END IF;
    v_year := EXTRACT(YEAR FROM p_start_date);

    -- 3. Overlap Check: Ensure no existing pending or approved leave overlaps
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.leave_requests
    WHERE user_id = v_user_id
      AND status IN ('pending', 'approved')
      AND (
          (start_date <= p_end_date AND end_date >= p_start_date)
      );

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'You already have an active or pending leave request overlapping with the selected dates.';
    END IF;

    -- 4. Retrieve Leave Type Code
    SELECT code INTO v_leave_code
    FROM public.leave_types
    WHERE id = p_leave_type_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid leave type specified';
    END IF;

    -- 5. Check & Lock Leave Balance (Row Lock for Concurrency Protection)
    SELECT id, allocated_days, used_days, pending_days
    INTO v_balance_id, v_allocated, v_used, v_pending
    FROM public.leave_balances
    WHERE user_id = v_user_id
      AND leave_type_id = p_leave_type_id
      AND year = v_year
    FOR UPDATE;

    -- If balance record does not exist for this year, create it on demand
    IF NOT FOUND THEN
        INSERT INTO public.leave_balances (user_id, leave_type_id, year, allocated_days, used_days, pending_days)
        SELECT v_user_id, p_leave_type_id, v_year, default_days_per_year, 0, 0
        FROM public.leave_types WHERE id = p_leave_type_id
        RETURNING id, allocated_days, used_days, pending_days
        INTO v_balance_id, v_allocated, v_used, v_pending;
    END IF;

    -- For paid leaves (non-unpaid), enforce balance check
    IF v_leave_code <> 'UL' THEN
        v_available := v_allocated - (v_used + v_pending);
        IF v_total_days > v_available THEN
            RAISE EXCEPTION 'Insufficient leave balance. Requested: % days, Available: % days.', v_total_days, v_available;
        END IF;
    END IF;

    -- 6. Insert Leave Request
    INSERT INTO public.leave_requests (
        user_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status
    ) VALUES (
        v_user_id,
        p_leave_type_id,
        p_start_date,
        p_end_date,
        v_total_days,
        p_reason,
        'pending'
    ) RETURNING id INTO v_new_request_id;

    -- 7. Atomically Increment Pending Days on Balance
    UPDATE public.leave_balances
    SET pending_days = pending_days + v_total_days,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_balance_id;

    -- 8. Record Audit Trail Entry
    INSERT INTO public.leave_audit_logs (
        leave_request_id,
        action,
        performed_by,
        new_status,
        notes
    ) VALUES (
        v_new_request_id,
        'created',
        v_user_id,
        'pending',
        'Leave request submitted by employee.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_request_id,
        'message', 'Leave application submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 4. Atomic Leave Action (Approve / Reject) with Row Locking
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_leave_action(
    p_request_id UUID,
    p_action leave_status,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_req RECORD;
    v_balance_id UUID;
    v_pending NUMERIC;
    v_expected_days INTEGER;
BEGIN
    -- 1. Security Check: Ensure caller is an authenticated admin
    IF v_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can approve or reject leave requests.';
    END IF;

    -- 2. Validate action input
    IF p_action IS NULL OR p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status action. Must be either approved or rejected.';
    END IF;

    IF p_action = 'rejected' AND (p_comment IS NULL OR trim(p_comment) = '') THEN
        RAISE EXCEPTION 'A rejection reason is mandatory when rejecting a leave request.';
    END IF;

    -- 3. Lock Leave Request row to prevent race conditions
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

    IF EXTRACT(YEAR FROM v_req.start_date) <> EXTRACT(YEAR FROM v_req.end_date) THEN
        RAISE EXCEPTION 'Cross-year leave requests cannot be processed';
    END IF;

    v_expected_days := public.calculate_working_days(v_req.start_date, v_req.end_date);
    IF v_req.total_days <> v_expected_days THEN
        RAISE EXCEPTION 'Stored leave duration does not match the date range';
    END IF;

    -- 4. Lock & Update Leave Balance
    SELECT id, pending_days INTO v_balance_id, v_pending
    FROM public.leave_balances
    WHERE user_id = v_req.user_id
      AND leave_type_id = v_req.leave_type_id
      AND year = EXTRACT(YEAR FROM v_req.start_date)
    FOR UPDATE;

    IF NOT FOUND OR v_pending < v_expected_days THEN
        RAISE EXCEPTION 'Leave balance hold is missing or inconsistent';
    END IF;

    IF p_action = 'approved' THEN
        -- Deduct from pending, credit to used
        UPDATE public.leave_balances
        SET pending_days = pending_days - v_expected_days,
            used_days = used_days + v_expected_days,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_balance_id;
    ELSIF p_action = 'rejected' THEN
        -- Release pending days hold back to available
        UPDATE public.leave_balances
        SET pending_days = pending_days - v_expected_days,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_balance_id;
    END IF;

    -- 5. Update Request Status
    UPDATE public.leave_requests
    SET status = p_action,
        admin_comment = p_comment,
        actioned_by = v_admin_id,
        actioned_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    -- 6. Insert Audit Log
    INSERT INTO public.leave_audit_logs (
        leave_request_id,
        action,
        performed_by,
        old_status,
        new_status,
        notes
    ) VALUES (
        p_request_id,
        CASE WHEN p_action = 'approved' THEN 'approved'::audit_action ELSE 'rejected'::audit_action END,
        v_admin_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.apply_for_leave(
    UUID, DATE, DATE, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_leave_action(
    UUID, leave_status, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_for_leave(
    UUID, DATE, DATE, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_leave_action(
    UUID, leave_status, TEXT
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Automated Cancellation Trigger: Releases Pending Balance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_leave_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    v_balance_id UUID;
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status = 'pending' THEN
        SELECT id INTO v_balance_id
        FROM public.leave_balances
        WHERE user_id = OLD.user_id
          AND leave_type_id = OLD.leave_type_id
          AND year = EXTRACT(YEAR FROM OLD.start_date);

        IF v_balance_id IS NOT NULL THEN
            UPDATE public.leave_balances
            SET pending_days = GREATEST(0, pending_days - OLD.total_days),
                updated_at = timezone('utc'::text, now())
            WHERE id = v_balance_id;
        END IF;

        INSERT INTO public.leave_audit_logs (
            leave_request_id, action, performed_by, old_status, new_status, notes
        ) VALUES (
            OLD.id, 'cancelled', COALESCE(auth.uid(), OLD.user_id), 'pending', 'cancelled', 'Leave request cancelled by applicant.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_leave_cancelled ON public.leave_requests;
CREATE TRIGGER trg_leave_cancelled
    AFTER UPDATE OF status ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_leave_cancellation();
