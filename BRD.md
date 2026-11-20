# Business Requirements Document (BRD)
## Enterprise Leave Management System

**Client / Organization:** Exelon Circuits Pvt. Ltd.  
**Author:** Senior Full Stack Developer & Technical Candidate  
**Target Position:** Full Stack Developer Intern  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to specify the business, functional, and non-functional requirements for the **Enterprise Leave Management System** developed for **Exelon Circuits Pvt. Ltd.** The system automates and streamlines employee leave applications, supervisor approvals, balance auditing, and administrative quota allocations.

### 1.2 Business Context
Prior manual or informal email/paper-based leave tracking leads to administrative overhead, human calculation errors, overlapping scheduling conflicts, lack of visibility into departmental availability, and compliance risks. This system replaces obsolete workflows with an automated, transparent, and audit-compliant digital portal.

---

## 2. Business Objectives

1. **Eliminate Operational Friction:** Reduce average leave request processing cycle time from days to minutes.
2. **Ensure Financial & Audit Compliance:** Maintain an immutable record of all leave requests, approvals, denials, and managerial remarks.
3. **Prevent Resource Shortages:** Provide managers with real-time insight into upcoming absenteeism to avoid operational disruption in circuit manufacturing and engineering.
4. **Transparent Employee Experience:** Enable employees to view real-time leave balances and receive immediate feedback on submissions.

---

## 3. Scope of the System

### 3.1 In-Scope
- Role-based authentication (Employees & Administrators).
- Automated leave quota provisioning for all newly registered staff.
- Self-service leave applications with dynamic weekend exclusion.
- Automated balance deductions and holds on pending submissions.
- Managerial approval and rejection workflows with mandatory feedback comments.
- Live administrative metrics and visual trend analytics.
- Centralized staff directory and leave quota management.
- Multi-device responsive design.

### 3.2 Out-of-Scope (Phase 1)
- Biometric hardware clock-in integration.
- Payroll deduction payroll engine API.
- Automated Slack/Microsoft Teams webhook notifications (planned for Phase 2).

---

## 4. Stakeholder Roles & Responsibilities

| Role | Responsibilities | Access Level |
| :--- | :--- | :--- |
| **Employee** | Applies for leave, monitors status, cancels pending requests, manages personal profile. | Limited to personal records (RLS enforced). |
| **HR / Manager (Admin)**| Reviews requests, approves/rejects with feedback, inspects staff balances, adjusts yearly quotas. | Full organizational visibility. |
| **System Auditor** | Verifies adherence to company labor policies and compliance. | Read-only access to audit logs. |

---

## 5. Functional Requirements (FR)

### FR-01: Authentication & Authorization
- **FR-01.1:** System shall support secure sign-up and sign-in via email and password using Supabase Auth.
- **FR-01.2:** Public sign-up shall automatically and irreversibly assign the role of `employee`.
- **FR-01.3:** Administrator roles shall only be assigned via authorized administrative procedures in PostgreSQL.
- **FR-01.4:** Middleware must protect all routes: `/admin/*` shall be inaccessible to non-administrators; `/employee/*` shall require an active session.

### FR-02: Leave Balance Provisioning & Tracking
- **FR-02.1:** Upon user creation, system shall automatically initialize balances for all active corporate leave types (Casual Leave: 12, Sick Leave: 10, Annual Leave: 15, Unpaid Leave: 0).
- **FR-02.2:** Available balance shall dynamically calculate as:  
  $$\text{Available} = \text{Allocated Days} - (\text{Used Days} + \text{Pending Days})$$
- **FR-02.3:** Submitting a request shall immediately place requested days into `pending_days`.

### FR-03: Leave Application Workflow
- **FR-03.1:** Employees can select from active leave types and specify start and end dates.
- **FR-03.2:** System shall automatically calculate working days, excluding Saturdays and Sundays.
- **FR-03.3:** System shall reject any request exceeding the available balance (except Unpaid Leave).
- **FR-03.4:** System shall prevent submission if the requested dates overlap with an existing pending or approved request.

### FR-04: Managerial Approval & Rejection Workflow
- **FR-04.1:** Admins can view an prioritized queue of all pending requests.
- **FR-04.2:** On **Approval**, the system shall atomically deduct days from `pending_days` and add them to `used_days`.
- **FR-04.3:** On **Rejection**, the system shall release days held in `pending_days` back to available quota.
- **FR-04.4:** When rejecting, entering an explanatory comment shall be strictly mandatory.
- **FR-04.5:** Database row locking (`SELECT ... FOR UPDATE`) shall guarantee zero race conditions during simultaneous approvals.

### FR-05: Executive Analytics & Staff Directory
- **FR-05.1:** Admin dashboard shall present real-time KPIs: Pending Approvals, Total Staff, Approved Leaves, Rejection Rate.
- **FR-05.2:** Visual analytics charts shall display leave distribution by category and approval breakdown.
- **FR-05.3:** Admins shall have access to a staff directory to inspect past leave history for any individual.

---

## 6. Non-Functional Requirements (NFR)

- **Performance:** Page load under 1.5 seconds on 4G networks; API response times under 300ms.
- **Data Integrity & ACID Compliance:** All status and balance adjustments execute inside atomic database transactions.
- **Security:**
  - Password hashing via bcrypt/Argon2 (handled via Supabase Auth).
  - Row-Level Security (RLS) active on all PostgreSQL tables.
  - HTTPS enforced across all endpoints.
- **Accessibility & Usability:** WCAG 2.1 AA compliant design with high contrast, clear typography, and responsive layouts across mobile, tablet, and desktop screens.

---

## 7. System Architecture & Database Design

### 7.1 Architecture
The application is built on a 3-tier serverless architecture:
1. **Presentation Layer:** Next.js App Router (React 19, Tailwind CSS, shadcn/ui).
2. **Application & Route Security Layer:** Edge Middleware, Next.js Server Actions, and Zod validation.
3. **Data & Persistence Layer:** Supabase PostgreSQL with RLS, triggers, and PL/pgSQL stored procedures.

### 7.2 Database Schema
- `profiles`: User account details, departments, roles.
- `leave_types`: Supported leave categories, codes, and default allocations.
- `leave_balances`: User balances per year, tracking allocated, used, and pending days.
- `leave_requests`: Leave application records with dates, status, and remarks.
- `leave_audit_logs`: Immutable audit trails logging every status change with actor timestamps.

---

## 8. Deployment Strategy

- **Source Control:** GitHub repository with branch protection rules.
- **Hosting & CDN:** Vercel Edge Network with automatic continuous integration (CI/CD).
- **Database:** Supabase managed PostgreSQL instance with daily automated backups.

---

## 9. Future Enhancements

1. **Email & Slack Notifications:** Automated notifications dispatched to managers upon request submission and to employees upon decision.
2. **Half-Day & Hourly Leaves:** Support for half-day morning/afternoon leave segments.
3. **Document Attachments:** Medical certificate upload support for Sick Leave requests lasting more than 2 days.
4. **Public Holiday Calendar Integration:** Dynamic exclusion of company and national holidays.
