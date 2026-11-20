
BEGIN;

-- ============================================================
-- 1. ADMIN CHECK FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.id = auth.uid()
          AND profile.role = 'admin'
    );
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ============================================================
-- 2. WORKING DAYS CALCULATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_working_days(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE
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

    RETURN (
        v_full_weeks * 5 + (
            SELECT pg_catalog.count(*)::INTEGER
            FROM pg_catalog.generate_series(
                0,
                v_remaining_days - 1
            ) AS remaining(day_offset)
            WHERE EXTRACT(
                ISODOW FROM (
                    p_start_date + remaining.day_offset
                )
            ) BETWEEN 1 AND 5
        )
    )::INTEGER;
END;
$$;

REVOKE ALL ON FUNCTION
    public.calculate_working_days(DATE, DATE)
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 3. NEW USER CREATION TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    v_leave_type RECORD;
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        department,
        designation
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            pg_catalog.split_part(NEW.email, '@', 1)
        ),
        'employee',
        COALESCE(
            NEW.raw_user_meta_data->>'department',
            'General'
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'designation',
            'Staff'
        )
    )
    ON CONFLICT (id) DO NOTHING;

    FOR v_leave_type IN
        SELECT
            leave_type.id,
            leave_type.default_days_per_year
        FROM public.leave_types AS leave_type
        WHERE leave_type.is_active
    LOOP
        INSERT INTO public.leave_balances (
            user_id,
            leave_type_id,
            year,
            allocated_days,
            used_days,
            pending_days
        )
        VALUES (
            NEW.id,
            v_leave_type.id,
            v_year,
            v_leave_type.default_days_per_year,
            0,
            0
        )
        ON CONFLICT (user_id, leave_type_id, year)
        DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 4. REMOVE OLD LEAVE APPLICATION FUNCTION SIGNATURES
-- ============================================================

DROP FUNCTION IF EXISTS public.apply_for_leave(
    UUID, UUID, DATE, DATE, NUMERIC, TEXT
);

DROP FUNCTION IF EXISTS public.apply_for_leave(
    UUID, DATE, DATE, NUMERIC, TEXT
);

DROP FUNCTION IF EXISTS public.apply_for_leave(
    UUID, DATE, DATE, TEXT
);


-- ============================================================
-- 5. APPLY FOR LEAVE
-- ============================================================

CREATE FUNCTION public.apply_for_leave(
    p_leave_type_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_year INTEGER;
    v_total_days INTEGER;
    v_leave_code TEXT;
    v_balance_id UUID;
    v_allocated NUMERIC;
    v_used NUMERIC;
    v_pending NUMERIC;
    v_available NUMERIC;
    v_request_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication required to apply for leave';
    END IF;

    IF p_leave_type_id IS NULL
       OR p_start_date IS NULL
       OR p_end_date IS NULL THEN
        RAISE EXCEPTION
            'Leave type, start date, and end date are required';
    END IF;

    IF p_start_date < CURRENT_DATE THEN
        RAISE EXCEPTION
            'Cannot apply for leave on past dates';
    END IF;

    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION
            'End date cannot be prior to start date';
    END IF;

    IF EXTRACT(YEAR FROM p_start_date)
       <> EXTRACT(YEAR FROM p_end_date) THEN
        RAISE EXCEPTION
            'Leave requests cannot cross calendar years';
    END IF;

    IF p_reason IS NULL
       OR pg_catalog.length(pg_catalog.btrim(p_reason)) < 5
       OR pg_catalog.length(pg_catalog.btrim(p_reason)) > 500 THEN
        RAISE EXCEPTION
            'Reason must contain between 5 and 500 characters';
    END IF;

    v_total_days :=
        public.calculate_working_days(p_start_date, p_end_date);

    IF v_total_days <= 0 THEN
        RAISE EXCEPTION
            'Selected date range contains no working days';
    END IF;

    v_year := EXTRACT(YEAR FROM p_start_date)::INTEGER;

    SELECT leave_type.code
    INTO v_leave_code
    FROM public.leave_types AS leave_type
    WHERE leave_type.id = p_leave_type_id
      AND leave_type.is_active;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive leave type';
    END IF;

    -- Serialize submissions for this employee.
    PERFORM 1
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee profile not found';
    END IF;

    -- Prevent overlapping pending or approved requests.
    IF EXISTS (
        SELECT 1
        FROM public.leave_requests AS request
        WHERE request.user_id = v_user_id
          AND request.status IN ('pending', 'approved')
          AND request.start_date <= p_end_date
          AND request.end_date >= p_start_date
    ) THEN
        RAISE EXCEPTION
            'An active or pending leave request overlaps these dates';
    END IF;

    -- Initialize the employee's balance if necessary.
    INSERT INTO public.leave_balances (
        user_id,
        leave_type_id,
        year,
        allocated_days,
        used_days,
        pending_days
    )
    SELECT
        v_user_id,
        leave_type.id,
        v_year,
        leave_type.default_days_per_year,
        0,
        0
    FROM public.leave_types AS leave_type
    WHERE leave_type.id = p_leave_type_id
      AND leave_type.is_active
    ON CONFLICT (user_id, leave_type_id, year)
    DO NOTHING;

    -- Lock the balance row.
    SELECT
        balance.id,
        balance.allocated_days,
        balance.used_days,
        balance.pending_days
    INTO
        v_balance_id,
        v_allocated,
        v_used,
        v_pending
    FROM public.leave_balances AS balance
    WHERE balance.user_id = v_user_id
      AND balance.leave_type_id = p_leave_type_id
      AND balance.year = v_year
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Leave balance could not be initialized';
    END IF;

    -- Check available leave balance.
    IF v_leave_code <> 'UL' THEN
        v_available := v_allocated - v_used - v_pending;

        IF v_total_days > v_available THEN
            RAISE EXCEPTION
                'Insufficient leave balance. Requested: % days, Available: % days.',
                v_total_days,
                v_available;
        END IF;
    END IF;

    -- Create leave request.
    INSERT INTO public.leave_requests (
        user_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status
    )
    VALUES (
        v_user_id,
        p_leave_type_id,
        p_start_date,
        p_end_date,
        v_total_days,
        pg_catalog.btrim(p_reason),
        'pending'
    )
    RETURNING id INTO v_request_id;

    -- Hold the requested leave balance.
    UPDATE public.leave_balances
    SET
        pending_days = pending_days + v_total_days,
        updated_at = pg_catalog.now()
    WHERE id = v_balance_id;

    -- Record the action.
    INSERT INTO public.leave_audit_logs (
        leave_request_id,
        action,
        performed_by,
        new_status,
        notes
    )
    VALUES (
        v_request_id,
        'created',
        v_user_id,
        'pending',
        'Leave request submitted by employee.'
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'message', 'Leave application submitted successfully'
    );
END;
$$;

ALTER FUNCTION public.apply_for_leave(
    UUID, DATE, DATE, TEXT
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.apply_for_leave(
    UUID, DATE, DATE, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_for_leave(
    UUID, DATE, DATE, TEXT
) TO authenticated;


-- ============================================================
-- 6. REMOVE OLD LEAVE APPROVAL FUNCTION SIGNATURES
-- ============================================================

DROP FUNCTION IF EXISTS public.process_leave_action(
    UUID, UUID, public.leave_status, TEXT
);

DROP FUNCTION IF EXISTS public.process_leave_action(
    UUID, public.leave_status, TEXT
);


-- ============================================================
-- 7. ADMIN APPROVE / REJECT LEAVE
-- ============================================================

CREATE FUNCTION public.process_leave_action(
    p_request_id UUID,
    p_action public.leave_status,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_request public.leave_requests%ROWTYPE;
    v_year INTEGER;
    v_year_start DATE;
    v_year_end DATE;
    v_year_days INTEGER;
    v_expected_days INTEGER;
    v_balance_id UUID;
    v_pending NUMERIC;
    v_comment TEXT :=
        NULLIF(pg_catalog.btrim(p_comment), '');
BEGIN
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    PERFORM 1
    FROM public.profiles AS profile
    WHERE profile.id = v_admin_id
      AND profile.role = 'admin'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Unauthorized: only administrators can process leave requests';
    END IF;

    IF p_action IS NULL
       OR p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status action';
    END IF;

    IF p_action = 'rejected' AND v_comment IS NULL THEN
        RAISE EXCEPTION
            'A rejection reason is mandatory';
    END IF;

    SELECT request.*
    INTO v_request
    FROM public.leave_requests AS request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request not found';
    END IF;

    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION
            'Request has already been processed with status: %',
            v_request.status;
    END IF;

    v_expected_days :=
        public.calculate_working_days(
            v_request.start_date,
            v_request.end_date
        );

    IF v_request.total_days <> v_expected_days THEN
        RAISE EXCEPTION
            'Stored leave duration does not match the date range; manual reconciliation is required';
    END IF;

    FOR v_year IN
        SELECT pg_catalog.generate_series(
            EXTRACT(YEAR FROM v_request.start_date)::INTEGER,
            EXTRACT(YEAR FROM v_request.end_date)::INTEGER
        )
    LOOP
        v_year_start := CASE
            WHEN v_request.start_date >
                 pg_catalog.make_date(v_year, 1, 1)
            THEN v_request.start_date
            ELSE pg_catalog.make_date(v_year, 1, 1)
        END;

        v_year_end := CASE
            WHEN v_request.end_date <
                 pg_catalog.make_date(v_year, 12, 31)
            THEN v_request.end_date
            ELSE pg_catalog.make_date(v_year, 12, 31)
        END;

        v_year_days :=
            public.calculate_working_days(
                v_year_start,
                v_year_end
            );

        IF v_year_days > 0 THEN
            SELECT
                balance.id,
                balance.pending_days
            INTO
                v_balance_id,
                v_pending
            FROM public.leave_balances AS balance
            WHERE balance.user_id = v_request.user_id
              AND balance.leave_type_id = v_request.leave_type_id
              AND balance.year = v_year
            FOR UPDATE;

            IF NOT FOUND OR v_pending < v_year_days THEN
                RAISE EXCEPTION
                    'Leave balance hold is missing or inconsistent for year %',
                    v_year;
            END IF;

            IF p_action = 'approved' THEN
                UPDATE public.leave_balances
                SET
                    pending_days = pending_days - v_year_days,
                    used_days = used_days + v_year_days,
                    updated_at = pg_catalog.now()
                WHERE id = v_balance_id;
            ELSE
                UPDATE public.leave_balances
                SET
                    pending_days = pending_days - v_year_days,
                    updated_at = pg_catalog.now()
                WHERE id = v_balance_id;
            END IF;
        END IF;
    END LOOP;

    UPDATE public.leave_requests
    SET
        status = p_action,
        admin_comment = v_comment,
        actioned_by = v_admin_id,
        actioned_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = p_request_id;

    INSERT INTO public.leave_audit_logs (
        leave_request_id,
        action,
        performed_by,
        old_status,
        new_status,
        notes
    )
    VALUES (
        p_request_id,
        CASE
            WHEN p_action = 'approved'
            THEN 'approved'::public.audit_action
            ELSE 'rejected'::public.audit_action
        END,
        v_admin_id,
        'pending',
        p_action,
        COALESCE(
            v_comment,
            'Status updated by administrator.'
        )
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'request_id', p_request_id,
        'status', p_action,
        'message',
        pg_catalog.format(
            'Leave request successfully %s',
            p_action
        )
    );
END;
$$;

ALTER FUNCTION public.process_leave_action(
    UUID, public.leave_status, TEXT
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.process_leave_action(
    UUID, public.leave_status, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_leave_action(
    UUID, public.leave_status, TEXT
) TO authenticated;


-- ============================================================
-- 8. LEAVE CANCELLATION TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_leave_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_request_days INTEGER;
    v_year INTEGER;
    v_year_start DATE;
    v_year_end DATE;
    v_year_days INTEGER;
    v_balance_id UUID;
    v_pending NUMERIC;
BEGIN
    IF OLD.status = 'pending'
       AND NEW.status = 'cancelled' THEN

        v_request_days :=
            public.calculate_working_days(
                OLD.start_date,
                OLD.end_date
            );

        IF OLD.total_days <> v_request_days THEN
            RAISE EXCEPTION
                'Stored leave duration does not match the date range; manual reconciliation is required';
        END IF;

        FOR v_year IN
            SELECT pg_catalog.generate_series(
                EXTRACT(YEAR FROM OLD.start_date)::INTEGER,
                EXTRACT(YEAR FROM OLD.end_date)::INTEGER
            )
        LOOP
            v_year_start := CASE
                WHEN OLD.start_date >
                     pg_catalog.make_date(v_year, 1, 1)
                THEN OLD.start_date
                ELSE pg_catalog.make_date(v_year, 1, 1)
            END;

            v_year_end := CASE
                WHEN OLD.end_date <
                     pg_catalog.make_date(v_year, 12, 31)
                THEN OLD.end_date
                ELSE pg_catalog.make_date(v_year, 12, 31)
            END;

            v_year_days :=
                public.calculate_working_days(
                    v_year_start,
                    v_year_end
                );

            IF v_year_days > 0 THEN
                SELECT
                    balance.id,
                    balance.pending_days
                INTO
                    v_balance_id,
                    v_pending
                FROM public.leave_balances AS balance
                WHERE balance.user_id = OLD.user_id
                  AND balance.leave_type_id = OLD.leave_type_id
                  AND balance.year = v_year
                FOR UPDATE;

                IF NOT FOUND OR v_pending < v_year_days THEN
                    RAISE EXCEPTION
                        'Leave balance hold is missing or inconsistent for year %',
                        v_year;
                END IF;

                UPDATE public.leave_balances
                SET
                    pending_days = pending_days - v_year_days,
                    updated_at = pg_catalog.now()
                WHERE id = v_balance_id;
            END IF;
        END LOOP;

        INSERT INTO public.leave_audit_logs (
            leave_request_id,
            action,
            performed_by,
            old_status,
            new_status,
            notes
        )
        VALUES (
            OLD.id,
            'cancelled',
            COALESCE(auth.uid(), OLD.user_id),
            'pending',
            'cancelled',
            'Leave request cancelled by applicant.'
        );
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_leave_cancellation() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.handle_leave_cancellation()
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 9. CANCEL LEAVE REQUEST RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_leave_request(
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_request public.leave_requests%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication required to cancel a leave request';
    END IF;

    SELECT request.*
    INTO v_request
    FROM public.leave_requests AS request
    WHERE request.id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_request.user_id <> v_user_id THEN
        RAISE EXCEPTION 'Leave request not found';
    END IF;

    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION
            'Only pending leave requests can be cancelled';
    END IF;

    UPDATE public.leave_requests
    SET
        status = 'cancelled',
        updated_at = pg_catalog.now()
    WHERE id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', TRUE,
        'request_id', p_request_id,
        'status', 'cancelled',
        'message', 'Leave request cancelled successfully'
    );
END;
$$;

ALTER FUNCTION public.cancel_leave_request(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.cancel_leave_request(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cancel_leave_request(UUID)
TO authenticated;


-- ============================================================
-- 10. REMOVE OLD RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_policy"
ON public.profiles;

DROP POLICY IF EXISTS "profiles_update_policy"
ON public.profiles;

DROP POLICY IF EXISTS "profiles_insert_policy"
ON public.profiles;

DROP POLICY IF EXISTS "leave_types_select_policy"
ON public.leave_types;

DROP POLICY IF EXISTS "leave_types_admin_all"
ON public.leave_types;

DROP POLICY IF EXISTS "leave_balances_select_policy"
ON public.leave_balances;

DROP POLICY IF EXISTS "leave_balances_admin_insert"
ON public.leave_balances;

DROP POLICY IF EXISTS "leave_balances_admin_update"
ON public.leave_balances;

DROP POLICY IF EXISTS "leave_balances_admin_mutation"
ON public.leave_balances;

DROP POLICY IF EXISTS "leave_requests_select_policy"
ON public.leave_requests;

DROP POLICY IF EXISTS "leave_requests_insert_policy"
ON public.leave_requests;

DROP POLICY IF EXISTS "leave_requests_update_policy"
ON public.leave_requests;

DROP POLICY IF EXISTS "leave_audit_logs_select_policy"
ON public.leave_audit_logs;

DROP POLICY IF EXISTS "leave_audit_logs_insert_policy"
ON public.leave_audit_logs;


-- ============================================================
-- 11. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_audit_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 12. PROFILES POLICIES
-- ============================================================

CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    public.is_admin()
    OR (
        id = auth.uid()
        AND role = 'employee'
    )
);


-- ============================================================
-- 13. LEAVE TYPES POLICIES
-- ============================================================

CREATE POLICY "leave_types_select_policy"
ON public.leave_types
FOR SELECT
TO authenticated
USING (
    is_active
    OR public.is_admin()
);

CREATE POLICY "leave_types_admin_all"
ON public.leave_types
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ============================================================
-- 14. LEAVE BALANCE POLICIES
-- ============================================================

CREATE POLICY "leave_balances_select_policy"
ON public.leave_balances
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "leave_balances_admin_insert"
ON public.leave_balances
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "leave_balances_admin_update"
ON public.leave_balances
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ============================================================
-- 15. LEAVE REQUEST POLICIES
-- ============================================================

CREATE POLICY "leave_requests_select_policy"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);


-- ============================================================
-- 16. LEAVE AUDIT LOG POLICIES
-- ============================================================

CREATE POLICY "leave_audit_logs_select_policy"
ON public.leave_audit_logs
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.leave_requests AS request
        WHERE request.id = leave_audit_logs.leave_request_id
          AND request.user_id = auth.uid()
    )
);


-- ============================================================
-- 17. TABLE PRIVILEGES
-- ============================================================

REVOKE ALL ON TABLE
    public.profiles,
    public.leave_types,
    public.leave_balances,
    public.leave_requests,
    public.leave_audit_logs
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
    public.profiles,
    public.leave_types,
    public.leave_balances,
    public.leave_requests,
    public.leave_audit_logs
TO authenticated;

GRANT UPDATE ON TABLE
    public.profiles
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
    public.leave_types
TO authenticated;

GRANT INSERT, UPDATE ON TABLE
    public.leave_balances
TO authenticated;

GRANT ALL ON TABLE
    public.profiles,
    public.leave_types,
    public.leave_balances,
    public.leave_requests,
    public.leave_audit_logs
TO service_role;


-- ============================================================
-- 18. LEAVE CANCELLATION TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_leave_cancelled
ON public.leave_requests;

CREATE TRIGGER trg_leave_cancelled
    AFTER UPDATE OF status ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_leave_cancellation();


-- ============================================================
-- COMPLETE MIGRATION
-- ============================================================

COMMIT;
