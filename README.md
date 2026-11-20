# Exelon Circuits – Enterprise Leave Management System

**Organization:** Exelon Circuits Pvt. Ltd.  
**Assessment:** Full Stack Developer Intern  
**Live Application:** https://leave-management-system-ullas10.vercel.app  
**GitHub Repository:** https://github.com/UllasBH/leave-management-system

## 1. Project Overview

The Exelon Circuits Enterprise Leave Management System is a web application for managing employee leave requests and administrative approvals. Employees can register and sign in, view leave balances, submit leave requests, and review request history. Administrators can review and process leave requests, inspect the employee directory, manage annual leave allocations, and view dashboard metrics and analytics.

The application uses Next.js and React for the web interface, Supabase for authentication and PostgreSQL data storage, and Vercel for hosting.

## 2. Business Problem and Objectives

Manual leave administration can make it difficult to track requests, maintain balances, identify date conflicts, and retain an approval history. This application centralizes those activities.

Project objectives:
- Provide employee and administrator authentication.
- Allow employees to submit leave requests and monitor their status.
- Calculate working days while excluding Saturdays and Sundays.
- Track allocated, used, and pending leave balances.
- Allow authorized administrators to approve or reject requests.
- Provide administrative visibility into leave activity, employee records, and annual allocations.
- Apply application-level and database-level access controls.

## 3. Features

### Employee Portal
- Employee registration and login.
- Employee dashboard with leave balance information and recent requests.
- Leave application with leave type, date range, and reason.
- Working-day calculation excluding Saturdays and Sundays.
- Validation of leave balance and overlapping pending/approved requests.
- Searchable/filterable leave history with request statuses.
- Cancellation of eligible pending requests.
- Employee profile editing and annual allocation visibility.

### Administrator Portal
- Administrator login and role-restricted dashboard.
- Dashboard metrics and leave analytics visualizations.
- Review queue for pending leave requests.
- Approve or reject leave requests; rejection requires a comment.
- Employee directory with leave-related inspection.
- Annual leave allocation management.

### Security and Data Integrity
- Supabase Auth for authentication and sessions.
- Role checks based on the user's database profile.
- Next.js middleware for session updates and route protection.
- PostgreSQL Row Level Security (RLS).
- Database functions for protected leave operations.
- Transactional balance updates and row locking for approval operations.
- Audit records for leave-related actions.

## 4. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web framework | Next.js 16 App Router | Routing and application rendering |
| UI | React 19 | Component-based interface |
| Language | TypeScript | Static typing |
| Styling | Tailwind CSS 4 | Responsive styling |
| UI icons | lucide-react | Interface icons |
| Authentication / backend | Supabase Auth and Supabase JS | Authentication and data access |
| Database | Supabase PostgreSQL | Persistent relational data |
| Validation | Zod | Form and input validation |
| Charts | Recharts | Dashboard visualizations |
| Hosting | Vercel | Production hosting |
| Source control | Git and GitHub | Version control |

Dependency versions are maintained in `package.json` and `package-lock.json`.

## 5. Architecture

The application uses a web client with Next.js application logic and Supabase-managed backend services.

1. **Presentation layer:** Next.js App Router pages and reusable React components.
2. **Application layer:** Page-level workflows, shared utilities, validation schemas, Supabase client access, and request middleware.
3. **Authentication layer:** Supabase Auth manages user identity and sessions.
4. **Data layer:** Supabase PostgreSQL stores profiles, leave types, balances, requests, and audit logs.
5. **Authorization layer:** Role checks, middleware, RLS policies, and protected PostgreSQL functions enforce access rules.

### Project Structure

```text
leave-management-system/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── employee/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── apply/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── admin/
│   │       ├── dashboard/page.tsx
│   │       ├── leaves/page.tsx
│   │       ├── employees/page.tsx
│   │       └── allocations/page.tsx
│   ├── api/auth/callback/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin/
│   ├── common/
│   ├── employee/
│   └── ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── validations/
│   │   ├── auth.ts
│   │   └── leave.ts
│   └── utils.ts
├── public/
├── scripts/
│   └── test_logic.mjs
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_stored_procedures.sql
│   │   ├── 004_seed_data.sql
│   │   └── 005_database_security_hardening.sql
│   ├── preflight_005.sql
│   └── full_schema.sql
├── types/
│   └── database.types.ts
├── middleware.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── README.md
└── BRD.md
```

Generated folders such as `.next/` and `node_modules/` are created locally and are not application source directories.

## 6. Database Design

The Supabase PostgreSQL database contains these core tables:

| Table | Purpose |
|---|---|
| `profiles` | User profile, role, department, and designation |
| `leave_types` | Leave categories and default yearly allocations |
| `leave_balances` | Per-user, per-leave-type, per-year allocated, used, and pending days |
| `leave_requests` | Leave date range, duration, reason, status, and administrator comment |
| `leave_audit_logs` | Records leave actions, actor, status changes, and notes |

The seed migration defines Casual Leave (CL), Sick Leave (SL), Annual Leave (AL), and Unpaid Leave (UL). The default allocations in the seed file are 12, 10, 15, and 0 days respectively.

### Database Functions

The migrations define the following important PostgreSQL functions:

- `is_admin()`: checks whether the authenticated profile has the administrator role.
- `calculate_working_days(start_date, end_date)`: calculates working days excluding weekends.
- `handle_new_user()`: creates the profile and initial leave balance records when a user is created.
- `apply_for_leave(...)`: validates and records a leave application and holds the requested balance.
- `process_leave_action(...)`: processes an administrator approval or rejection and updates balances.
- `handle_leave_cancellation()`: handles balance release and audit logging when an eligible request is cancelled.
- `cancel_leave_request(...)`: allows an employee to cancel their own eligible pending request.

The SQL migration files are the source of truth for function signatures, table constraints, triggers, and RLS policies.

## 7. Authentication and Authorization

- Supabase Auth handles email/password registration, login, and sessions.
- The profile record stores the assigned `employee` or `admin` role.
- Application navigation and middleware protect employee and administrator routes.
- PostgreSQL RLS policies restrict access to profile, leave, balance, and audit records.
- Sensitive leave actions are implemented through database functions with identity and role checks.
- Public registration is intended for employee accounts; administrator privileges must be assigned through a trusted administrative procedure, not selected by a public registrant.

## 8. API and Backend Details

The project does not define a separate Express server. Supabase is the primary backend service.

### Next.js Route Handler

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/callback` | GET | Handles the Supabase authentication callback and code exchange |

The other leave operations use Supabase Auth, database queries, and PostgreSQL RPC functions rather than separate Next.js REST endpoints. See the SQL migrations and `lib/supabase/` for implementation details.

## 9. Prerequisites

- Node.js (use a currently supported LTS release).
- npm.
- Git.
- A Supabase project.
- A Vercel account for deployment.

## 10. Local Setup

### 10.1 Clone the repository

```bash
git clone https://github.com/UllasBH/leave-management-system.git
cd leave-management-system
```

### 10.2 Install dependencies

```bash
npm install
```

### 10.3 Configure environment variables

Create a local `.env.local` file in the project root. Use `.env.example` as the source of truth for the exact variable names and copy the template without committing secrets.

The application code currently uses the following configuration variables; confirm the names and required values against the checked-in environment template before running:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_public_or_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If the server-side code requires a service-role credential, keep it server-only and never prefix it with `NEXT_PUBLIC_`. Never commit `.env.local` or expose private keys in client-side code.

### 10.4 Configure Supabase database

Review the SQL files in `supabase/migrations/` and apply them in their intended order:

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_stored_procedures.sql`
4. `004_seed_data.sql`
5. `005_database_security_hardening.sql`

The repository also contains `supabase/full_schema.sql` as a consolidated schema file. Do not apply the consolidated schema on top of an already initialized database without first checking what objects and migrations have already been applied. Do not rerun migrations blindly on a live database.

For migration 005, review `supabase/preflight_005.sql` and its results before applying the hardening migration to an existing database. Confirm the intended data and policy effects and take an appropriate backup.

### 10.5 Configure an administrator

Public registration is for employees. To provision an administrator, use an authorized account and a trusted administrative process. The seed migration contains a commented example SQL update showing how an administrator role can be assigned to an existing profile. Do not expose administrative credentials or allow users to self-assign the admin role.

### 10.6 Run the development server

```bash
npm run dev
```

Open http://localhost:3000.

## 11. Available Scripts and Testing

The scripts currently defined in `package.json` are:

| Command | Purpose |
|---|---|
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Creates a production build |
| `npm start` | Runs the production server |
| `npm run lint` | Runs ESLint |

The repository also includes a logic test script:

```bash
node scripts/test_logic.mjs
```

Run the appropriate checks before deployment:

```bash
npm run lint
npx tsc --noEmit
npm run build
node scripts/test_logic.mjs
```

The TypeScript command is run directly; it is not currently a named npm script in `package.json`. Actual test and build outcomes depend on the environment in which these commands are executed.

## 12. Deployment

### Hosting and services

| Responsibility | Service |
|---|---|
| Next.js web application | Vercel |
| Authentication | Supabase Auth |
| Relational database | Supabase PostgreSQL |
| Database authorization | Supabase RLS and PostgreSQL functions |
| Source control | GitHub |

### Live deployment

https://leave-management-system-ullas10.vercel.app

### Initial deployment steps

1. Push the source code to the GitHub repository.
2. Sign in to Vercel and import `UllasBH/leave-management-system`.
3. Select the Next.js framework configuration.
4. Add the required environment variables in Vercel Project Settings for the relevant deployment environments.
5. Confirm the production Supabase project URL and keys.
6. Apply and verify the required database migrations in Supabase.
7. Add the production Vercel URL to the Supabase authentication redirect URL configuration.
8. Deploy the application.
9. Open the production URL and verify login, route access, and the leave workflows with authorized accounts.

### Updating the application

1. Make and review code changes locally.
2. Run lint, type-check, logic tests, and a production build.
3. Commit the reviewed changes to Git.
4. Push the change to the connected GitHub branch.
5. Vercel builds and deploys the updated commit.
6. Verify the deployed application after the deployment completes.

Database migrations are separate from frontend deployments. Review migrations and existing data before applying any database change to production.

## 13. Security Considerations

- Keep `.env.local` out of source control.
- Do not expose Supabase service-role credentials to browser code.
- Enforce authorization in PostgreSQL, not only through hidden UI controls.
- Use RLS to scope employee access to permitted records.
- Restrict administrator operations to authenticated administrators.
- Review database migrations before applying them to a live database.
- Configure production authentication redirect URLs explicitly.

## 14. Limitations and Future Improvements

Possible future improvements include:
- Email or messaging notifications for leave submissions and decisions.
- Half-day leave support.
- Document attachments for leave requests where required by policy.
- Public holiday calendar integration.
- Additional reporting and export options.

## 15. Conclusion

The Exelon Circuits Leave Management System provides a centralized solution for employee leave applications, approval workflows, leave history, balance tracking, and administrative oversight. It combines a Next.js application with Supabase authentication and PostgreSQL data services, and is hosted on Vercel.

**Live Application:** https://leave-management-system-ullas10.vercel.app  
**Source Code:** https://github.com/UllasBH/leave-management-system
