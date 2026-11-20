-- ============================================================================
-- 003_stored_procedures.sql
-- PL/pgSQL Atomic Functions, Triggers, and Stored Procedures
-- Enterprise Leave Management System
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Automatic User Profile & Leave Balance Initialization Trigger
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
    );

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. Atomic Leave Application Procedure with Overlap & Balance Verification
-- ----------------------------------------------------------------------------
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
    -- 1. Validate date logic
    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION 'End date cannot be prior to start date';
    END IF;

    IF p_total_days <= 0 THEN
        RAISE EXCEPTION 'Total days must be greater than zero';
    END IF;

    -- 2. Overlap Check: Ensure no existing pending or approved leave overlaps
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

    -- 3. Retrieve Leave Type Code
    SELECT code INTO v_leave_code
    FROM public.leave_types
    WHERE id = p_leave_type_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid leave type specified';
    END IF;

    -- 4. Check & Lock Leave Balance (Row Lock for Concurrency Protection)
    SELECT id, allocated_days, used_days, pending_days
    INTO v_balance_id, v_allocated, v_used, v_pending
    FROM public.leave_balances
    WHERE user_id = p_user_id
      AND leave_type_id = p_leave_type_id
      AND year = v_year
    FOR UPDATE;

    -- If balance record does not exist for this year, create it on demand
    IF NOT FOUND THEN
        INSERT INTO public.leave_balances (user_id, leave_type_id, year, allocated_days, used_days, pending_days)
        SELECT p_user_id, p_leave_type_id, v_year, default_days_per_year, 0, 0
        FROM public.leave_types WHERE id = p_leave_type_id
        RETURNING id, allocated_days, used_days, pending_days
        INTO v_balance_id, v_allocated, v_used, v_pending;
    END IF;

    -- For paid leaves (non-unpaid), enforce balance check
    IF v_leave_code <> 'UL' THEN
        v_available := v_allocated - (v_used + v_pending);
        IF p_total_days > v_available THEN
            RAISE EXCEPTION 'Insufficient leave balance. Requested: % days, Available: % days.', p_total_days, v_available;
        END IF;
    END IF;

    -- 5. Insert Leave Request
    INSERT INTO public.leave_requests (
        user_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status
    ) VALUES (
        p_user_id,
        p_leave_type_id,
        p_start_date,
        p_end_date,
        p_total_days,
        p_reason,
        'pending'
    ) RETURNING id INTO v_new_request_id;

    -- 6. Atomically Increment Pending Days on Balance
    UPDATE public.leave_balances
    SET pending_days = pending_days + p_total_days,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_balance_id;

    -- 7. Record Audit Trail Entry
    INSERT INTO public.leave_audit_logs (
        leave_request_id,
        action,
        performed_by,
        new_status,
        notes
    ) VALUES (
        v_new_request_id,
        'created',
        p_user_id,
        'pending',
        'Leave request submitted by employee.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_request_id,
        'message', 'Leave application submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 3. Atomic Leave Action (Approve / Reject) with Row Locking
-- ----------------------------------------------------------------------------
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
    -- 1. Security Check: Ensure caller is an admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can approve or reject leave requests.';
    END IF;

    -- 2. Validate action input
    IF p_action NOT IN ('approved', 'rejected') THEN
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

    -- 4. Lock & Update Leave Balance
    SELECT id INTO v_balance_id
    FROM public.leave_balances
    WHERE user_id = v_req.user_id
      AND leave_type_id = v_req.leave_type_id
      AND year = EXTRACT(YEAR FROM v_req.start_date)
    FOR UPDATE;

    IF v_balance_id IS NOT NULL THEN
        IF p_action = 'approved' THEN
            -- Deduct from pending, credit to used
            UPDATE public.leave_balances
            SET pending_days = GREATEST(0, pending_days - v_req.total_days),
                used_days = used_days + v_req.total_days,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_balance_id;
        ELSIF p_action = 'rejected' THEN
            -- Release pending days hold back to available
            UPDATE public.leave_balances
            SET pending_days = GREATEST(0, pending_days - v_req.total_days),
                updated_at = timezone('utc'::text, now())
            WHERE id = v_balance_id;
        END IF;
    END IF;

    -- 5. Update Request Status
    UPDATE public.leave_requests
    SET status = p_action,
        admin_comment = p_comment,
        actioned_by = p_admin_id,
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
