-- ============================================================================
-- 004_seed_data.sql
-- Default Leave Types & Seed Data
-- Enterprise Leave Management System
-- ============================================================================

-- 1. Insert Standard Corporate Leave Types
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

-- 2. Helper documentation for setting up the initial administrator:
-- After registering an account via the registration page (e.g. admin@exelon.com),
-- run the following SQL command in Supabase SQL Editor to grant admin privileges:
--
-- UPDATE public.profiles
-- SET role = 'admin',
--     designation = 'HR Director',
--     department = 'Human Resources'
-- WHERE email = 'admin@exelon.com';
