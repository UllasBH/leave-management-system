# Exelon Circuits – Enterprise Leave Management System

**Organization:** Exelon Circuits Pvt. Ltd.  
**Assessment:** Full Stack Developer Intern  
**Live Application:** https://leave-management-system-iota-sable.vercel.app/  
**GitHub Repository:** https://github.com/UllasBH/leave-management-system

---

## 1. Project Overview

The **Exelon Circuits Enterprise Leave Management System** is a web-based application developed to manage employee leave requests and administrative approvals.

The system provides separate access for employees and administrators. Employees can register, sign in, apply for leave, view their leave balances, and monitor their leave history. Administrators can review employee leave requests, approve or reject applications, inspect employee records, manage annual leave allocations, and monitor leave activities through a dashboard.

The application is built using Next.js, React, TypeScript, Tailwind CSS, and Supabase. It is deployed using Vercel.

## 2. Problem Statement

Traditional leave management processes often depend on manual forms, emails, and spreadsheets. These methods can make it difficult to track leave applications, calculate available leave balances, identify overlapping requests, and maintain approval records.

This project provides a centralized digital platform that simplifies leave application, approval, and tracking processes.

## 3. Project Objectives

- Provide secure login for employees and administrators.
- Allow employees to submit leave applications.
- Allow administrators to approve or reject leave requests.
- Maintain employee leave history.
- Track allocated, used, and pending leave balances.
- Provide an administrative dashboard.
- Reduce manual effort in leave administration.
- Protect application information through authentication and database-level authorization.

## 4. Features

### 4.1 Employee Portal

- **Employee Registration and Login:** Employees can create accounts and sign in using email and password.
- **Employee Dashboard:** Displays leave balance information and recent leave requests.
- **Leave Application:** Employees can apply for leave by selecting a leave type, start date, end date, and reason.
- **Working-Day Calculation:** Calculates leave duration while excluding Saturdays and Sundays.
- **Balance Validation:** Checks available leave balances before submitting requests.
- **Overlap Detection:** Prevents conflicting pending or approved leave requests.
- **Leave History:** Displays submitted requests with statuses such as Pending, Approved, Rejected, and Cancelled.
- **Request Cancellation:** Allows employees to cancel eligible pending requests.
- **Profile Management:** Allows employees to update profile information and view annual leave allocations.

### 4.2 Administrator Portal

- **Admin Login:** Provides access to authorized administrators.
- **Admin Dashboard:** Displays leave-related metrics and analytics.
- **Approval Queue:** Allows administrators to view pending leave applications.
- **Approve or Reject Requests:** Administrators can process employee leave requests.
- **Rejection Comments:** Requires an explanatory comment when rejecting a leave request.
- **Employee Directory:** Provides a directory for viewing employee information and leave records.
- **Leave Allocation Management:** Allows administrators to manage annual leave quotas.
- **Leave Analytics:** Displays leave distribution and approval-related visualizations.

### 4.3 Security and Data Integrity

- Supabase Auth for authentication and session management.
- Role-based access for employees and administrators.
- Next.js middleware for protected route handling.
- PostgreSQL Row Level Security (RLS).
- Database functions for sensitive leave operations.
- Database row locking for concurrent approval operations.
- Audit records for leave-related actions.

## 5. Technology Stack

| Technology | Version / Package | Purpose |
|---|---|---|
| Next.js | 16.4.6 | Application framework and routing |
| React | 19.3.0 | User interface development |
| TypeScript | 5.x | Type-safe development |
| Tailwind CSS | 4.3.3 | Responsive styling |
| Supabase JS | 2.119.2 | Database and authentication access |
| Supabase SSR | 0.12.7 | Server-side Supabase integration |
| Zod | 4.6.7 | Input and form validation |
| Recharts | 3.11.0 | Dashboard charts and analytics |
| lucide-react | 1.76.0 | Icons |
| Vercel | Cloud hosting | Application deployment |
| Git and GitHub | Version control | Source code management |

Dependency versions are defined in `package.json` and `package-lock.json`.

## 6. System Architecture

The application follows a three-layer web architecture supported by Supabase backend services.

### 6.1 Presentation Layer

Developed using Next.js App Router and React.

Responsibilities:

- Display employee and administrator interfaces.
- Provide leave application forms.
- Display leave balances and request history.
- Display administrative dashboards and analytics.
- Provide navigation between application modules.

### 6.2 Application and Security Layer

Implemented using Next.js application logic, middleware, shared utilities, and Zod validation.

Responsibilities:

- Validate user input.
- Handle authentication-related application flows.
- Protect employee and administrator routes.
- Process leave-related operations.
- Communicate with Supabase services.

### 6.3 Data Layer

Implemented using Supabase PostgreSQL.

Responsibilities:

- Store user profiles.
- Maintain leave types and balances.
- Store leave applications.
- Record leave approval and rejection actions.
- Enforce database-level access restrictions.

## 7. Project Structure

The project is organized into the following directories and files:

```text
leave-management-system/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── employee/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── apply/
│   │   │   │   └── page.tsx
│   │   │   ├── history/
│   │   │   │   └── page.tsx
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │   │
│   │   └── admin/
│   │       ├── dashboard/
│   │       │   └── page.tsx
│   │       ├── leaves/
│   │       │   └── page.tsx
│   │       ├── employees/
│   │       │   └── page.tsx
│   │       └── allocations/
│   │           └── page.tsx
│   │
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── admin/
│   ├── common/
│   ├── employee/
│   └── ui/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   │
│   ├── validations/
│   │   ├── auth.ts
│   │   └── leave.ts
│   │
│   └── utils.ts
│
├── public/
│
├── scripts/
│   └── test_logic.mjs
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_stored_procedures.sql
│   │   ├── 004_seed_data.sql
│   │   └── 005_database_security_hardening.sql
│   │
│   ├── preflight_005.sql
│   └── full_schema.sql
│
├── types/
│   └── database.types.ts
│
├── middleware.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── README.md
└── BRD.md

### Important Directories

| Directory | Description |
|---|---|
| `app/` | Contains application pages, routing, and API route handlers |
| `components/` | Contains reusable UI, employee, and admin components |
| `lib/` | Contains shared utilities, Supabase clients, and validation schemas |
| `public/` | Stores static assets |
| `scripts/` | Contains project test utilities |
| `supabase/` | Contains database schema, migrations, and preflight checks |
| `types/` | Contains TypeScript database type definitions |

## 8. Database Design

The application uses Supabase PostgreSQL as its relational database.

### 8.1 Main Database Tables

| Table | Description |
|---|---|
| `profiles` | Stores user profile details, roles, departments, and designations |
| `leave_types` | Stores available leave categories and default yearly allocations |
| `leave_balances` | Stores allocated, used, and pending leave days for employees |
| `leave_requests` | Stores leave applications, dates, duration, reason, status, and comments |
| `leave_audit_logs` | Maintains records of leave-related actions and status changes |

### 8.2 Leave Categories

The seed migration defines the following leave categories:

| Leave Type | Code | Default Annual Allocation |
|---|---|---:|
| Casual Leave | CL | 12 days |
| Sick Leave | SL | 10 days |
| Annual Leave | AL | 15 days |
| Unpaid Leave | UL | 0 days |

These are the default values configured in the seed SQL file.

### 8.3 Database Functions

The Supabase migrations define the following important PostgreSQL functions:

| Function | Responsibility |
|---|---|
| `is_admin()` | Checks whether the authenticated user has the administrator role |
| `calculate_working_days()` | Calculates working days excluding weekends |
| `handle_new_user()` | Creates a user profile and initializes leave balances |
| `apply_for_leave()` | Validates and submits an employee leave application |
| `process_leave_action()` | Processes administrator approval or rejection |
| `handle_leave_cancellation()` | Handles balance updates and audit logging for cancellation |
| `cancel_leave_request()` | Cancels an eligible leave request belonging to the authenticated employee |

The exact function definitions and parameters are maintained in the SQL migration files.

## 9. Authentication and Authorization

Supabase Authentication is used for user registration, login, and session management.

The application uses the `profiles` table to identify the assigned role of an authenticated user.

Security mechanisms include:

- Employee and administrator role checks.
- Protected employee and admin routes.
- Middleware-based session handling.
- PostgreSQL Row Level Security policies.
- Database-side authorization for sensitive leave operations.
- Restricted execution privileges for protected database functions.

Public registration is intended for employee accounts. Administrator privileges must be assigned through a trusted administrative process rather than unrestricted public registration.

## 10. API and Backend Details

The application uses Supabase as its primary backend service. It does not use a separate Express backend.

### 10.1 Next.js API Route

| Endpoint | HTTP Method | Purpose |
|---|---|---|
| `/api/auth/callback` | GET | Exchanges the Supabase authentication code for a session and redirects the user |

### 10.2 Supabase Backend Operations

The application uses Supabase authentication and PostgreSQL operations for:

- Registration and login.
- Profile retrieval.
- Leave balance retrieval.
- Leave application submission.
- Leave history retrieval.
- Leave approval and rejection.
- Leave request cancellation.
- Leave allocation and administrative operations.

Protected database operations use PostgreSQL functions where implemented. These operations are not separate Next.js REST API endpoints.

## 11. Prerequisites

Before setting up the project, ensure the following are installed:

- Node.js (supported LTS version recommended).
- npm.
- Git.
- Visual Studio Code or another code editor.
- A Supabase account.
- A Vercel account for deployment.

## 12. Installation and Setup

### Step 1: Clone the Repository

\`\`\`bash
git clone https://github.com/UllasBH/leave-management-system.git
\`\`\`

### Step 2: Navigate to the Project

\`\`\`bash
cd leave-management-system
\`\`\`

### Step 3: Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Step 4: Configure Environment Variables

Create a `.env.local` file in the root directory.

The current Supabase client and server configuration use these environment variables:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_public_key
\`\`\`

Obtain the project URL and public client key from the Supabase project settings.

The application currently uses these two variables in its browser client, server client, and middleware.

**Security guidelines:**

- Do not commit `.env.local` to GitHub.
- Do not expose private service-role credentials in frontend code.
- Never place private secrets in variables prefixed with `NEXT_PUBLIC_`.
- Configure production variables in Vercel project settings.

### Step 5: Configure Supabase Database

The repository contains database migrations under:

`supabase/migrations/`

For a new database, review and apply the migrations in this order:

1. `001_initial_schema.sql` – creates the initial database schema and tables.
2. `002_rls_policies.sql` – configures Row Level Security policies.
3. `003_stored_procedures.sql` – creates database functions and triggers.
4. `004_seed_data.sql` – inserts the default leave categories.
5. `005_database_security_hardening.sql` – applies the additional database security controls.

The project also contains:

- `supabase/full_schema.sql` – consolidated schema initialization file.
- `supabase/preflight_005.sql` – preflight checks related to migration 005.

Use either the ordered migration approach or the consolidated schema approach for a fresh database, after reviewing the files. Do not execute both approaches on an already initialized database without checking which objects and migrations have been applied.

Before applying migration 005 to an existing database, review the preflight SQL results and migration effects. Back up important data and review any destructive-looking operations before execution.

### Step 6: Configure an Administrator Account

Public registration is intended for employee accounts.

To authorize an administrator:

1. Register the account through the employee registration page.
2. Open the Supabase SQL Editor using an authorized database administrator account.
3. Verify the account exists in `public.profiles`.
4. Assign the administrator role through the approved administrative process.

The seed migration includes a commented SQL example for assigning an administrator role to an existing profile. Administrator privileges must never be granted through an unrestricted client-side registration form.

### Step 7: Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open the following URL in your browser:

http://localhost:3000

## 13. Available Scripts and Testing

The scripts defined in `package.json` are:

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Creates the production build |
| `npm start` | Starts the production server |
| `npm run lint` | Runs ESLint |

The repository also contains a business-logic test script:

\`\`\`bash
node scripts/test_logic.mjs
\`\`\`

Additional TypeScript validation can be run using:

\`\`\`bash
npx tsc --noEmit
\`\`\`

The TypeScript command is run directly; it is not currently defined as an npm script.

## 14. Deployment

### 14.1 Hosting Platform

The application is deployed on **Vercel**.

Supabase provides authentication, database storage, and backend services. GitHub is used for source code management.

| Component | Platform |
|---|---|
| Frontend Application | Vercel |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Database Security | Supabase RLS |
| Source Code Management | GitHub |

### 14.2 Live Application URL

https://leave-management-system-iota-sable.vercel.app/

### 14.3 Initial Deployment Procedure

1. Maintain the application source code in the GitHub repository.
2. Sign in to Vercel.
3. Select **Add New Project** and import the GitHub repository.
4. Select the Next.js framework configuration.
5. Configure the required Supabase environment variables.
6. Connect the deployment to the correct Supabase project.
7. Verify that the required database migrations are applied.
8. Configure the production authentication redirect URLs in Supabase.
9. Deploy the application through Vercel.
10. Verify that the production login page and application routes open correctly.
11. Test employee and administrator workflows using authorized accounts.

### 14.4 Environment Variables in Vercel

Add the following variables in:

**Vercel Dashboard → Project → Settings → Environment Variables**

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_public_key
\`\`\`

Configure them for the required deployment environments.

After changing environment variables, create a new deployment for the changes to take effect.

### 14.5 Supabase Authentication Configuration

Configure the production application URL in the Supabase Authentication URL settings.

Verify the allowed redirect URLs for:

- Local development.
- Production Vercel deployment.
- Authentication callback route.

The application uses:

`/api/auth/callback`

for the Supabase authentication code exchange flow.

### 14.6 Application Update Procedure

1. Make the required changes in the local project.
2. Run ESLint checks.
3. Run TypeScript validation.
4. Run the business-logic test script.
5. Create a production build.
6. Review and commit the changes to Git.
7. Push the approved changes to the connected GitHub branch.
8. Vercel builds and deploys the updated application.
9. Verify the production deployment after completion.

Database migrations should be reviewed and applied separately from frontend deployments. Existing database records and policies must be considered before applying production migrations.

### 14.7 Production Verification Checklist

After deployment, verify:

- Login page accessibility.
- Employee login.
- Administrator login.
- Employee leave application.
- Leave balance calculation.
- Leave history.
- Administrator dashboard.
- Leave request approval.
- Leave request rejection.
- Leave request cancellation.
- Role-based route restrictions.
- Database authorization and RLS policies.

## 15. Security Considerations

- Authentication is required for protected application features.
- Employee and administrator permissions are separated.
- Middleware protects restricted application routes.
- PostgreSQL RLS policies restrict access to protected records.
- Sensitive leave operations use database-side authorization.
- Database functions have controlled execution privileges.
- Private credentials must not be committed to the repository.
- Production database migrations must be reviewed before execution.

## 16. Future Enhancements

Possible future improvements include:

- Email notifications for leave request submissions and decisions.
- Half-day leave support.
- Medical certificate or supporting document uploads.
- Public holiday calendar integration.
- Additional reports and data export facilities.

## 17. Conclusion

The Exelon Circuits Enterprise Leave Management System provides a centralized platform for employee leave applications, approval workflows, leave history, balance tracking, and administrative oversight.

The application combines Next.js, React, TypeScript, Supabase, PostgreSQL, and Vercel to provide a structured and cloud-hosted leave management solution.

**Live Application:** https://leave-management-system-iota-sable.vercel.app/  
**GitHub Repository:** https://github.com/UllasBH/leave-management-system

---

**Developed for the Exelon Circuits Technical Assessment.**
