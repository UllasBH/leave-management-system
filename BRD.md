# BUSINESS REQUIREMENTS DOCUMENT (BRD)

# Exelon Circuits – Enterprise Leave Management System

| Document Information | Details |
|---|---|
| Project Name | Enterprise Leave Management System |
| Organization | Exelon Circuits Pvt. Ltd. |
| Document Type | Business Requirements Document |
| Assessment | Full Stack Developer Intern |
| Version | 1.0 |
| Application Type | Web-Based Application |
| Frontend Framework | Next.js |
| Backend and Database | Supabase |
| Hosting Platform | Vercel |
| Source Code Repository | https://github.com/UllasBH/leave-management-system |
| Live Application | https://leave-management-system-iota-sable.vercel.app/ |

---

## 1. Introduction

### 1.1 Purpose

The purpose of this project is to develop an Enterprise Leave Management System for Exelon Circuits Pvt. Ltd.

The system provides a centralized platform for managing employee leave applications, approval processes, leave history, and leave balances.

It provides separate access for employees and administrators. Employees can submit leave requests and monitor their leave information, while authorized administrators can review applications, approve or reject requests, manage employee leave allocations, and monitor leave activities through an administrative dashboard.

### 1.2 Business Background

Traditional leave management processes may involve paper forms, emails, and spreadsheets. These methods can make it difficult to track employee leave requests, calculate available leave balances, identify overlapping leave periods, and maintain approval records.

The proposed system replaces these manual activities with a centralized web-based application.

### 1.3 Business Problem

The organization requires an efficient leave management system that can:

- Simplify employee leave applications.
- Reduce manual leave tracking.
- Provide a structured approval process.
- Maintain accurate leave balances.
- Track employee leave history.
- Provide administrators with visibility into employee leave activities.
- Protect employee and organizational information.

## 2. Business Objectives

The main objectives of the system are:

1. Provide secure login for employees and administrators.
2. Allow employees to submit leave applications online.
3. Enable administrators to approve or reject leave requests.
4. Maintain employee leave history.
5. Calculate and track employee leave balances.
6. Prevent conflicting leave applications.
7. Provide an administrative dashboard with leave-related information.
8. Support annual leave allocation management.
9. Maintain appropriate access control and data integrity.

## 3. Project Scope

### 3.1 In-Scope Features

The current project includes:

- Employee registration and login.
- Administrator login.
- Employee dashboard.
- Administrator dashboard.
- Employee leave application.
- Working-day calculation.
- Leave balance validation.
- Overlapping leave request detection.
- Leave request approval and rejection.
- Rejection comments.
- Leave history.
- Pending leave request cancellation.
- Employee profile management.
- Employee directory.
- Annual leave quota allocation.
- Leave analytics and dashboard visualizations.
- Role-based access control.
- Database-level security.

### 3.2 Out-of-Scope Features

The following features are outside the current project scope:

- Payroll processing.
- Salary calculation.
- Biometric attendance integration.
- Recruitment management.
- Employee performance management.
- Third-party HR platform integration.
- Automated messaging integrations such as Slack or Microsoft Teams.
- Public holiday calendar integration.
- Half-day and hourly leave processing.

These may be considered for future enhancements.

## 4. Stakeholders

| Stakeholder | Responsibilities |
|---|---|
| Employees | Apply for leave, view leave balances, and track leave history |
| Administrators / HR Managers | Review leave applications, approve or reject requests, inspect employee records, and manage leave allocations |
| Organization | Uses the system to manage and monitor employee leave operations |
| Developer | Develops, tests, documents, and maintains the application |

## 5. User Roles and Responsibilities

### 5.1 Employee

An employee is an authenticated user who can:

- Register an employee account.
- Log in using registered credentials.
- Access the employee dashboard.
- View available leave balances.
- Apply for leave.
- View submitted leave applications.
- Monitor application status.
- View leave history.
- Cancel eligible pending leave requests.
- Update permitted profile information.

Employees can access only the records and operations permitted by their assigned role and database authorization policies.

### 5.2 Administrator

An administrator is an authorized user who can:

- Log in using administrator credentials.
- Access the admin dashboard.
- View pending leave applications.
- Review employee leave requests.
- Approve leave applications.
- Reject leave applications with an explanatory comment.
- View employee records.
- Inspect employee leave information.
- Manage annual leave allocations.
- Monitor leave-related dashboard metrics and analytics.

Administrator privileges must be assigned through an authorized administrative process. Public employee registration must not allow users to grant themselves administrator privileges.

## 6. Functional Requirements

### FR-01: Employee Authentication

- FR-01.1: The system shall allow employees to register using the required registration information.
- FR-01.2: The system shall allow registered employees to log in using email and password.
- FR-01.3: The system shall validate authentication credentials.
- FR-01.4: The system shall provide access to the employee dashboard after successful employee authentication.
- FR-01.5: The system shall maintain authenticated user sessions.

### FR-02: Administrator Authentication

- FR-02.1: The system shall allow authorized administrators to log in.
- FR-02.2: The system shall verify the assigned administrator role.
- FR-02.3: The system shall restrict administrator pages to authorized administrators.
- FR-02.4: Employees shall not be allowed to access administrator-only features.

### FR-03: Employee Dashboard

- FR-03.1: The system shall provide employees with a dashboard.
- FR-03.2: The dashboard shall display relevant leave balance information.
- FR-03.3: The dashboard shall display recent leave request information.
- FR-03.4: The dashboard shall provide navigation to leave application, history, and profile features.

### FR-04: Leave Balance Provisioning and Tracking

- FR-04.1: The system shall maintain leave balances for each employee and leave category.
- FR-04.2: The system shall initialize configured leave balances when a new employee profile is created.
- FR-04.3: The system shall maintain allocated days, used days, and pending days.
- FR-04.4: Available leave shall be calculated using the following formula:

  **Available Leave = Allocated Days − Used Days − Pending Days**

- FR-04.5: The system shall reserve the requested leave days when an eligible request is submitted.
- FR-04.6: The system shall update balances according to approval, rejection, and eligible cancellation operations.

### FR-05: Leave Application

- FR-05.1: Employees shall be able to select an available leave category.
- FR-05.2: Employees shall provide a start date and end date.
- FR-05.3: Employees shall provide a reason for leave.
- FR-05.4: The system shall validate submitted leave details.
- FR-05.5: The system shall calculate working days by excluding Saturdays and Sundays.
- FR-05.6: The system shall validate leave balance availability.
- FR-05.7: The system shall detect overlapping pending or approved leave requests.
- FR-05.8: The system shall create a pending leave application when the request passes validation.
- FR-05.9: Requests crossing calendar years must follow the configured rule to be submitted as separate requests.

### FR-06: Leave Request Approval and Rejection

- FR-06.1: Administrators shall be able to view pending employee leave requests.
- FR-06.2: Administrators shall be able to approve pending requests.
- FR-06.3: Administrators shall be able to reject pending requests.
- FR-06.4: The system shall require an explanatory comment when a request is rejected.
- FR-06.5: On approval, the system shall transfer the applicable days from pending balance to used balance.
- FR-06.6: On rejection, the system shall release the reserved pending leave days.
- FR-06.7: The system shall prevent an already processed request from being processed again.

### FR-07: Leave History

- FR-07.1: Employees shall be able to view their previous leave applications.
- FR-07.2: The system shall display leave request status.
- FR-07.3: The system shall maintain relevant leave-related activity records.
- FR-07.4: Employees shall only access their permitted leave records.
- FR-07.5: Administrators shall be able to inspect employee leave records according to their authorization.

### FR-08: Leave Request Cancellation

- FR-08.1: Employees shall be able to cancel their own eligible pending leave requests.
- FR-08.2: The system shall prevent cancellation of requests that have already been processed.
- FR-08.3: The system shall release the associated pending leave balance when an eligible request is cancelled.
- FR-08.4: The system shall record the cancellation activity.

### FR-09: Employee Profile Management

- FR-09.1: Employees shall be able to view their profile information.
- FR-09.2: Employees shall be able to update permitted profile details.
- FR-09.3: The system shall protect role and other restricted profile information from unauthorized modification.

### FR-10: Administrator Dashboard and Analytics

- FR-10.1: The system shall provide a dashboard for administrators.
- FR-10.2: The dashboard shall display relevant leave management metrics.
- FR-10.3: Administrators shall be able to view pending approval information.
- FR-10.4: The system shall provide leave distribution and approval-related visualizations.

### FR-11: Employee Directory and Annual Leave Allocation

- FR-11.1: Administrators shall be able to view the employee directory.
- FR-11.2: Administrators shall be able to inspect employee leave information.
- FR-11.3: Administrators shall be able to manage annual leave allocations according to their permissions.
- FR-11.4: The system shall restrict allocation changes to authorized administrators.

## 7. Non-Functional Requirements

### 7.1 Security

- The system shall authenticate users before granting access to protected features.
- The system shall implement role-based access control.
- Employee and administrator permissions shall be separated.
- Supabase Row Level Security shall restrict unauthorized database access.
- Sensitive operations shall require database-side authorization.
- Private environment credentials shall not be exposed in frontend code.

### 7.2 Performance

- The application should provide responsive page navigation.
- Database operations should retrieve only the required information.
- The application should avoid unnecessary database requests.
- Important leave operations should complete efficiently.

### 7.3 Usability

- The system shall provide a user-friendly interface.
- Navigation shall be understandable for employees and administrators.
- Forms shall display appropriate validation feedback.
- Leave application statuses shall be clearly identifiable.
- The interface shall support commonly used desktop and mobile screen sizes.

### 7.4 Reliability and Data Integrity

- Leave applications should be stored reliably.
- Important balance changes should maintain consistent database records.
- Concurrent approval operations should be protected through database locking.
- Failed operations should not leave partially updated leave balances.

### 7.5 Maintainability

- The application shall use a modular project structure.
- TypeScript shall be used for type safety.
- Database changes shall be managed through SQL migration files.
- Documentation shall support application setup and maintenance.

## 8. Business Rules

1. Only authenticated employees can submit leave applications.
2. Only authorized administrators can approve or reject leave requests.
3. Employees must not access administrator-only features.
4. Administrator privileges must be assigned through an authorized process.
5. Leave application dates must form a valid date range.
6. Working days are calculated by excluding Saturdays and Sundays.
7. Leave requests must pass the configured balance validation.
8. Overlapping pending or approved requests must be detected.
9. Pending leave days are reserved from the available balance.
10. Approved leave days are transferred to used balance.
11. Rejected leave requests release the associated pending balance.
12. Only eligible pending requests may be cancelled by employees.
13. A rejection comment is mandatory.
14. Leave balance changes must be protected against unauthorized direct modification.
15. Requests crossing calendar years must be submitted separately according to the configured application rule.

## 9. Business Workflows

### 9.1 Employee Leave Application Workflow

**Process:**

1. Employee opens the Leave Management System.
2. Employee enters registered login credentials.
3. The system authenticates the employee.
4. Employee dashboard is displayed.
5. Employee selects the Apply Leave option.
6. Employee selects a leave type.
7. Employee enters start date, end date, and reason.
8. The system validates the submitted information.
9. The system calculates working days.
10. The system checks balance availability and overlapping requests.
11. The system creates a pending leave application if validation succeeds.
12. The requested leave days are reserved in the pending balance.
13. Employee can view the request status through leave history.

### 9.2 Administrator Approval Workflow

**Process:**

1. Administrator opens the Leave Management System.
2. Administrator enters authorized login credentials.
3. The system verifies the administrator role.
4. Admin dashboard is displayed.
5. Administrator opens the pending leave requests.
6. Administrator reviews an employee application.
7. Administrator selects Approve or Reject.
8. If rejected, an explanatory comment is entered.
9. The system processes the decision.
10. The leave request status is updated.
11. The relevant leave balance is updated.
12. The activity is recorded in the audit log.

### 9.3 Leave Cancellation Workflow

**Process:**

1. Employee opens leave history.
2. Employee selects an eligible pending request.
3. Employee requests cancellation.
4. The system verifies request ownership and pending status.
5. The system cancels the request.
6. The associated pending balance is released.
7. The cancellation is recorded in the audit log.

## 10. System Architecture

The system follows a three-layer web application architecture supported by Supabase backend services.

### 10.1 Presentation Layer

**Technology:** Next.js App Router, React, TypeScript, and Tailwind CSS.

Responsibilities:

- Employee and administrator interfaces.
- Login and registration pages.
- Employee dashboard.
- Leave application forms.
- Leave history and balance displays.
- Administrative dashboards and management interfaces.

### 10.2 Application and Security Layer

**Technology:** Next.js application logic, middleware, Supabase SSR clients, and Zod validation.

Responsibilities:

- Authentication-related workflows.
- User input validation.
- Route protection.
- Role-based navigation.
- Leave request processing.
- Communication with the database.

### 10.3 Database Layer

**Technology:** Supabase PostgreSQL.

Responsibilities:

- User profile storage.
- Leave category management.
- Employee leave balance storage.
- Leave application storage.
- Leave-related audit records.
- Database functions, triggers, and access policies.

## 11. Database Overview

The application uses Supabase PostgreSQL.

### 11.1 Main Database Tables

| Table | Purpose |
|---|---|
| `profiles` | Stores user profile details, roles, departments, and designations |
| `leave_types` | Stores available leave categories and default allocations |
| `leave_balances` | Stores yearly allocated, used, and pending leave days |
| `leave_requests` | Stores employee leave applications and their statuses |
| `leave_audit_logs` | Stores relevant leave-related activity records |

### 11.2 Default Leave Categories

The database seed migration defines the following default categories:

| Leave Category | Code | Default Annual Allocation |
|---|---|---:|
| Casual Leave | CL | 12 days |
| Sick Leave | SL | 10 days |
| Annual Leave | AL | 15 days |
| Unpaid Leave | UL | 0 days |

These values are the defaults defined in the database seed file. They may be managed according to authorized allocation rules.

### 11.3 Database Functions

The database migrations define functions for:

- Checking administrator permissions.
- Calculating working days.
- Creating a profile and initializing leave balances for a newly registered user.
- Submitting leave applications.
- Processing approval and rejection decisions.
- Cancelling eligible leave requests.
- Maintaining cancellation and audit records.

The database functions and their exact definitions are maintained in the Supabase SQL migration files.

## 12. Technology Requirements

| Component | Technology |
|---|---|
| Frontend Framework | Next.js 16 |
| UI Library | React 19 |
| Programming Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Form Validation | Zod |
| Charts | Recharts |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Database Security | Supabase Row Level Security |
| Application Hosting | Vercel |
| Source Code Management | Git and GitHub |
| Runtime and Package Manager | Node.js and npm |

## 13. Assumptions and Constraints

### 13.1 Assumptions

- Employees have valid registered accounts.
- Administrator accounts are authorized through a trusted administrative process.
- The organization defines its leave categories and policies.
- Leave allocation values are configured in the database.
- Supabase services are available.
- Users have internet connectivity to access the application.

### 13.2 Constraints

- The application depends on Vercel and Supabase availability.
- User access depends on authentication and assigned roles.
- Leave balance calculations depend on configured database rules.
- Production deployment requires valid environment variables.
- Database migrations must be applied in the correct order.
- The current working-day calculation excludes weekends but does not provide public holiday calendar integration.

## 14. Acceptance Criteria

The system will be considered to satisfy its core business requirements when:

1. Employees can register and log in using valid credentials.
2. Authorized administrators can log in.
3. Employees can access their dashboard.
4. Employees can submit valid leave applications.
5. Working-day calculations exclude Saturdays and Sundays.
6. The system validates leave balance and overlapping dates.
7. Administrators can approve pending requests.
8. Administrators can reject requests with a mandatory comment.
9. Leave balances are updated according to approval and rejection actions.
10. Employees can view their leave history.
11. Employees can cancel eligible pending requests.
12. Administrators can access the employee directory and leave allocation features.
13. Unauthorized users cannot access restricted features or records.
14. The production application is accessible through its deployment URL.
15. Project documentation explains how another developer can install and deploy the application.

## 15. Deployment

### 15.1 Hosting Platform

The Enterprise Leave Management System is hosted using **Vercel**.

Supabase provides authentication, database storage, and backend services. GitHub is used for source code management.

| Component | Platform / Service |
|---|---|
| Frontend Application | Vercel |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Database Authorization | Supabase RLS |
| Source Code Management | GitHub |
| Local Development | Node.js and npm |

### 15.2 Live Application URL

https://leave-management-system-iota-sable.vercel.app/

### 15.3 Source Code Repository

https://github.com/UllasBH/leave-management-system

### 15.4 Deployment Approach

The application follows a cloud-based deployment approach.

The Next.js application is hosted on Vercel, while Supabase provides authentication and PostgreSQL database services.

GitHub is used to maintain the source code and version history.

The deployment process includes:

1. Maintaining the application source code in GitHub.
2. Connecting the GitHub repository to Vercel.
3. Configuring required environment variables.
4. Connecting the application to the Supabase project.
5. Applying the required database migrations.
6. Configuring authentication redirect URLs.
7. Building and deploying the application through Vercel.
8. Verifying production functionality.

### 15.5 Required Services

**1. Vercel**

Vercel is used to host the Next.js web application and manage production deployments.

**2. Supabase**

Supabase provides:

- Authentication services.
- PostgreSQL database hosting.
- Database functions and triggers.
- Row Level Security policies.

**3. GitHub**

GitHub is used for source code storage, version control, and repository management.

**4. Node.js and npm**

Node.js and npm are required for installing dependencies, running the application locally, and generating production builds.

### 15.6 Environment Variable Configuration

The application uses the following Supabase configuration variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_public_or_anon_key
```

These names are used by the application's Supabase client, server client, and middleware.

The values must be obtained from the appropriate Supabase project settings.

Environment variables must be configured in Vercel under:

**Vercel Dashboard → Project → Settings → Environment Variables**

Security requirements:

- Local `.env.local` files must not be committed to GitHub.
- Private service-role credentials must never be exposed through browser-side code.
- Variables with the `NEXT_PUBLIC_` prefix must not contain private secrets.
- Production environment variables must be configured for the appropriate deployment environments.

### 15.7 Initial Deployment Procedure

The following steps describe how to deploy the application:

1. Create or configure the Supabase project.
2. Review the database schema and migration files.
3. Apply the required migrations in the intended order.
4. Verify tables, functions, triggers, and RLS policies.
5. Configure Supabase authentication.
6. Push the reviewed application source code to GitHub.
7. Sign in to the Vercel dashboard.
8. Select **Add New Project**.
9. Import the `UllasBH/leave-management-system` GitHub repository.
10. Select the Next.js framework configuration.
11. Add the required Supabase environment variables.
12. Connect the application to the correct Supabase project.
13. Configure production authentication redirect URLs.
14. Deploy the application.
15. Open the production URL.
16. Verify employee and administrator workflows using authorized accounts.

### 15.8 Database Migration Considerations

The project contains the following migration files:

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_stored_procedures.sql`
4. `004_seed_data.sql`
5. `005_database_security_hardening.sql`

The repository also contains:

- `supabase/full_schema.sql` – consolidated schema initialization file.
- `supabase/preflight_005.sql` – preflight queries for reviewing the database before migration 005.

For an existing database:

- Review the migrations already applied.
- Run the relevant preflight checks.
- Review the results before applying additional migration changes.
- Back up important database information.
- Do not rerun the consolidated schema on an already initialized database without checking for duplicate or conflicting objects.
- Verify RLS policies and required database functions after migration.

Database migrations should be managed separately from frontend code deployments.

### 15.9 Application Update Procedure

When an application update is required:

1. Open the project in the local development environment.
2. Make the required source code modifications.
3. Run ESLint checks.
4. Run TypeScript validation.
5. Execute the available business logic tests.
6. Generate a production build.
7. Review and commit the approved changes.
8. Push the changes to the connected GitHub branch.
9. Allow Vercel to build and deploy the new version.
10. Verify the updated production application.

If database changes are required, review and apply the corresponding migration separately before depending on the new database functionality.

### 15.10 Production Verification Checklist

After deployment or an update, verify the following:

- Login page opens successfully.
- Employee authentication works.
- Administrator authentication works.
- Employee dashboard loads.
- Leave application can be submitted.
- Leave balances are displayed correctly.
- Leave history is available.
- Administrator dashboard loads.
- Pending leave requests are visible to authorized administrators.
- Leave approval works.
- Leave rejection works with a comment.
- Eligible leave cancellation works.
- Employee directory and leave allocation features are accessible to administrators.
- Unauthorized access is restricted.
- Supabase database access policies work correctly.

## 16. Testing Requirements

### 16.1 Functional Testing

The following functionalities should be tested:

- Employee registration and login.
- Administrator login.
- Leave application submission.
- Working-day calculation.
- Leave balance validation.
- Overlapping request detection.
- Leave approval.
- Leave rejection.
- Leave cancellation.
- Leave history retrieval.
- Administrator dashboard.
- Employee directory and annual allocations.

### 16.2 Security Testing

Security testing should verify:

- Authentication is required for protected routes.
- Employees cannot access administrator-only pages.
- Users cannot access another employee's restricted records.
- Public registration cannot assign administrator privileges.
- Database RLS policies restrict unauthorized actions.
- Protected database functions enforce the appropriate authorization.

### 16.3 Build and Code Validation

The following project commands are available:

```bash
npm run lint
npm run build
node scripts/test_logic.mjs
npx tsc --noEmit
```

The actual result of each command should be recorded after execution.

## 17. Future Enhancements

Possible future improvements include:

1. Email notifications when leave applications are submitted or processed.
2. Half-day and hourly leave support.
3. Supporting document uploads for medical leave.
4. Public and company holiday calendar integration.
5. Additional employee leave reports.
6. Exportable administrative reports.
7. Additional dashboard analytics.

## 18. Conclusion

The Exelon Circuits Enterprise Leave Management System provides a centralized platform for managing employee leave applications, approval workflows, leave history, and leave balance tracking.

It simplifies leave administration by providing separate employee and administrator interfaces, structured database records, role-based access, and administrative monitoring features.

The application uses Next.js, React, TypeScript, Supabase, PostgreSQL, and Vercel to provide a cloud-hosted leave management solution.

**Live Application:** https://leave-management-system-iota-sable.vercel.app/

**GitHub Repository:** https://github.com/UllasBH/leave-management-system

---

**Developed for the Exelon Circuits Technical Assessment.**