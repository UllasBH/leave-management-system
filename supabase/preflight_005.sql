-- Read-only preflight for supabase/migrations/005_database_security_hardening.sql.
-- Run only after reviewing the statements. Every statement in this file is SELECT.
-- Expected migration order: 001_initial_schema.sql, 002_rls_policies.sql,
-- 003_stored_procedures.sql, 004_seed_data.sql, then 005.

-- 1. Pending requests that cross a calendar-year boundary.
SELECT
    request.id AS request_id,
    request.user_id AS employee_id,
    request.leave_type_id,
    request.start_date,
    request.end_date,
    EXTRACT(YEAR FROM request.start_date)::INTEGER AS start_year,
    EXTRACT(YEAR FROM request.end_date)::INTEGER AS end_year,
    request.total_days AS stored_total_days
FROM public.leave_requests AS request
WHERE request.status = 'pending'
  AND EXTRACT(YEAR FROM request.start_date) <> EXTRACT(YEAR FROM request.end_date)
ORDER BY request.user_id, request.start_date, request.id;

-- 2. Pending requests whose stored duration differs from the migration's
--    weekday-only calculation. This is self-contained so it works before 005
--    creates public.calculate_working_days(DATE, DATE).
WITH pending_spans AS (
    SELECT
        request.id AS request_id,
        request.user_id AS employee_id,
        request.leave_type_id,
        request.start_date,
        request.end_date,
        request.total_days AS stored_total_days,
        request.end_date - request.start_date + 1 AS span_days
    FROM public.leave_requests AS request
    WHERE request.status = 'pending'
),
calculated AS (
    SELECT
        pending.*,
        (
            (pending.span_days / 7) * 5
            + (
                SELECT pg_catalog.count(*)::INTEGER
                FROM pg_catalog.generate_series(
                    0,
                    (pending.span_days % 7) - 1
                ) AS remaining(day_offset)
                WHERE EXTRACT(
                    ISODOW FROM (pending.start_date + remaining.day_offset)
                ) BETWEEN 1 AND 5
            )
        )::NUMERIC AS calculated_total_days
    FROM pending_spans AS pending
)
SELECT
    request_id,
    employee_id,
    leave_type_id,
    start_date,
    end_date,
    EXTRACT(YEAR FROM start_date)::INTEGER AS start_year,
    EXTRACT(YEAR FROM end_date)::INTEGER AS end_year,
    stored_total_days,
    calculated_total_days
FROM calculated
WHERE stored_total_days IS DISTINCT FROM calculated_total_days
ORDER BY employee_id, start_date, request_id;

-- 3. Compare each leave balance's pending_days with the pending requests'
--    calculated weekday holds for that employee, leave type, and calendar year.
--    A full outer join also reports missing balance rows and unbacked holds.
WITH pending_requests AS (
    SELECT
        request.id AS request_id,
        request.user_id AS employee_id,
        request.leave_type_id,
        request.start_date,
        request.end_date
    FROM public.leave_requests AS request
    WHERE request.status = 'pending'
),
year_slices AS (
    SELECT
        pending.request_id,
        pending.employee_id,
        pending.leave_type_id,
        year_range.calendar_year AS year,
        GREATEST(
            pending.start_date,
            pg_catalog.make_date(year_range.calendar_year, 1, 1)
        ) AS slice_start,
        LEAST(
            pending.end_date,
            pg_catalog.make_date(year_range.calendar_year, 12, 31)
        ) AS slice_end
    FROM pending_requests AS pending
    CROSS JOIN LATERAL pg_catalog.generate_series(
        EXTRACT(YEAR FROM pending.start_date)::INTEGER,
        EXTRACT(YEAR FROM pending.end_date)::INTEGER
    ) AS year_range(calendar_year)
),
calculated_year_slices AS (
    SELECT
        slice.*,
        (
            ((slice.slice_end - slice.slice_start + 1) / 7) * 5
            + (
                SELECT pg_catalog.count(*)::INTEGER
                FROM pg_catalog.generate_series(
                    0,
                    ((slice.slice_end - slice.slice_start + 1) % 7) - 1
                ) AS remaining(day_offset)
                WHERE EXTRACT(
                    ISODOW FROM (slice.slice_start + remaining.day_offset)
                ) BETWEEN 1 AND 5
            )
        )::NUMERIC AS calculated_year_days
    FROM year_slices AS slice
),
expected_holds AS (
    SELECT
        employee_id,
        leave_type_id,
        year,
        pg_catalog.sum(calculated_year_days) AS expected_pending_days,
        pg_catalog.string_agg(request_id::TEXT, ', ' ORDER BY request_id) AS request_ids
    FROM calculated_year_slices
    GROUP BY employee_id, leave_type_id, year
)
SELECT
    COALESCE(balance.user_id, expected.employee_id) AS employee_id,
    COALESCE(balance.leave_type_id, expected.leave_type_id) AS leave_type_id,
    COALESCE(balance.year, expected.year) AS year,
    expected.request_ids,
    COALESCE(expected.expected_pending_days, 0)::NUMERIC AS expected_pending_days,
    COALESCE(balance.pending_days, 0)::NUMERIC AS actual_pending_days,
    (
        COALESCE(balance.pending_days, 0)
        - COALESCE(expected.expected_pending_days, 0)
    )::NUMERIC AS pending_days_discrepancy
FROM expected_holds AS expected
FULL OUTER JOIN public.leave_balances AS balance
    ON balance.user_id = expected.employee_id
   AND balance.leave_type_id = expected.leave_type_id
   AND balance.year = expected.year
WHERE COALESCE(balance.pending_days, 0)
      IS DISTINCT FROM COALESCE(expected.expected_pending_days, 0)
ORDER BY employee_id, leave_type_id, year;

-- 4. Check for orphaned request references in case foreign-key constraints
--    are absent, disabled, or were bypassed during historical imports.
SELECT
    request.id AS request_id,
    request.user_id AS employee_id,
    request.leave_type_id,
    request.start_date,
    request.end_date,
    EXTRACT(YEAR FROM request.start_date)::INTEGER AS start_year,
    EXTRACT(YEAR FROM request.end_date)::INTEGER AS end_year,
    (profile.id IS NULL) AS missing_profile,
    (leave_type.id IS NULL) AS missing_leave_type
FROM public.leave_requests AS request
LEFT JOIN public.profiles AS profile
    ON profile.id = request.user_id
LEFT JOIN public.leave_types AS leave_type
    ON leave_type.id = request.leave_type_id
WHERE profile.id IS NULL
   OR leave_type.id IS NULL
ORDER BY request.id;

-- 5. Inventory all policies on the five application tables. Compare policy
--    names, roles, commands, permissiveness, USING, and WITH CHECK expressions.
SELECT
    policy.schemaname,
    policy.tablename,
    policy.policyname,
    policy.permissive,
    policy.roles,
    policy.cmd,
    policy.qual AS using_expression,
    policy.with_check AS check_expression
FROM pg_catalog.pg_policies AS policy
WHERE policy.schemaname = 'public'
  AND policy.tablename IN (
      'profiles',
      'leave_types',
      'leave_balances',
      'leave_requests',
      'leave_audit_logs'
  )
ORDER BY policy.tablename, policy.policyname;

-- 6. Inventory relevant function overloads, owners, SECURITY DEFINER status,
--    configured search_path, and explicit/default EXECUTE ACL entries.
SELECT
    namespace.nspname AS schema_name,
    procedure.proname AS function_name,
    pg_catalog.pg_get_function_identity_arguments(procedure.oid) AS identity_arguments,
    pg_catalog.pg_get_function_result(procedure.oid) AS result_type,
    procedure.prosecdef AS security_definer,
    procedure.proconfig AS function_settings,
    pg_catalog.pg_get_userbyid(procedure.proowner) AS function_owner,
    pg_catalog.has_function_privilege('anon', procedure.oid, 'EXECUTE') AS anon_can_execute,
    pg_catalog.has_function_privilege('authenticated', procedure.oid, 'EXECUTE') AS authenticated_can_execute,
    pg_catalog.has_function_privilege('service_role', procedure.oid, 'EXECUTE') AS service_role_can_execute,
    COALESCE(
        (
            SELECT pg_catalog.jsonb_agg(
                pg_catalog.jsonb_build_object(
                    'grantee', COALESCE(grantee.rolname, 'PUBLIC'),
                    'privilege', privilege.privilege_type,
                    'grantable', privilege.is_grantable
                )
                ORDER BY COALESCE(grantee.rolname, 'PUBLIC')
            )
            FROM pg_catalog.aclexplode(
                COALESCE(
                    procedure.proacl,
                    pg_catalog.acldefault('f', procedure.proowner)
                )
            ) AS privilege
            LEFT JOIN pg_catalog.pg_roles AS grantee
                ON grantee.oid = privilege.grantee
            WHERE privilege.privilege_type = 'EXECUTE'
        ),
        '[]'::JSONB
    ) AS execute_acl
FROM pg_catalog.pg_proc AS procedure
JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
WHERE namespace.nspname = 'public'
  AND procedure.proname IN (
      'is_admin',
      'calculate_working_days',
      'handle_new_user',
      'apply_for_leave',
      'process_leave_action',
      'handle_leave_cancellation',
      'cancel_leave_request'
  )
ORDER BY procedure.proname, identity_arguments;

-- 7. Check whether RLS is enabled and forced on each application table.
SELECT
namespace.nspname AS table_schema,
relation.relname AS table_name,
relation.relrowsecurity AS row_level_security_enabled,
relation.relforcerowsecurity AS row_level_security_forced
FROM pg_catalog.pg_class AS relation
JOIN pg_catalog.pg_namespace AS namespace
ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname IN (
  'profiles',
  'leave_types',
  'leave_balances',
  'leave_requests',
  'leave_audit_logs'
  )
  AND relation.relkind IN ('r', 'p')
ORDER BY relation.relname;

-- 8. Check the expected Auth signup and leave-cancellation triggers without
--    changing them.
SELECT
    namespace.nspname AS table_schema,
    relation.relname AS table_name,
    trigger.tgname AS trigger_name,
    trigger.tgenabled AS trigger_enabled,
    pg_catalog.pg_get_triggerdef(trigger.oid, TRUE) AS trigger_definition,
    procedure.proname AS function_name,
    procedure.prosecdef AS security_definer
FROM pg_catalog.pg_trigger AS trigger
JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger.tgrelid
JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger.tgfoid
WHERE NOT trigger.tgisinternal
  AND (
      (namespace.nspname = 'auth'
       AND relation.relname = 'users'
       AND trigger.tgname = 'on_auth_user_created')
      OR
      (namespace.nspname = 'public'
       AND relation.relname = 'leave_requests'
       AND trigger.tgname = 'trg_leave_cancelled')
  )
ORDER BY table_schema, table_name, trigger_name;
