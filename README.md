# 🏢 Enterprise Leave Management System

**Organization:** Exelon Circuits Pvt. Ltd.  
**Role Assessment:** Full Stack Developer Intern  
**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL, Auth, RLS, Functions), Zod, Vercel

---

## 🌟 Executive Overview
The **Exelon Circuits Enterprise Leave Management System** is a production-grade, secure, and responsive web application engineered to modernize corporate time-off workflows. It provides employees with seamless self-service leave requests, automatic balance tracking, and status visibility, while equipping managers and administrators with real-time analytics, concurrent approval queues, and granular quota allocations.

---

## 🚀 Key Features

### 👤 Employee Portal
- **Corporate Registration & Login:** Self-service registration with automated employee onboarding and initial leave quota provisioning.
- **Dynamic Leave Balance Cards:** Real-time metrics for Casual Leave (CL), Sick Leave (SL), Annual Leave (AL), and Unpaid Leave (UL) with consumption progress bars.
- **Intelligent Leave Application:**
  - Dynamic working days computation automatically excluding weekends (Saturdays and Sundays).
  - Client-side and server-side balance limit enforcement.
  - Real-time overlapping leave conflict detection.
- **Audited History & Status Tracking:** Searchable and filterable history table with color-coded status badges (`Pending`, `Approved`, `Rejected`, `Cancelled`) and cancellation capability.
- **Self-Service Profile:** Edit departmental details and review annual entitlement limits.

### 🛡️ Admin & Managerial Hub
- **Executive Metrics & KPI Dashboard:** Real-time visibility into pending approvals, active staff roster, approved days consumed, and denial ratios.
- **Interactive Leave Analytics:** Recharts visualizations detailing leave distribution by category and overall approval ratios.
- **Actionable Approvals Queue:** Quick review modals with mandatory rejection comments to maintain transparent communication.
- **Race-Condition-Proof Approvals:** PL/pgSQL stored procedures with row-level locks (`SELECT ... FOR UPDATE`) ensuring safe, concurrent approval processing.
- **Employee Roster Directory:** Filterable staff table with deep-dive leave inspections for any employee.
- **Annual Quota Matrix:** Customize and allocate leave day allowances per employee and year.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router) & React 19 | Hybrid SSR and Server Components for optimal performance, instant initial load, and security. |
| **Language** | TypeScript | Strict compile-time type safety across data contracts, UI components, and API schemas. |
| **Styling & UI** | Tailwind CSS & shadcn/ui design tokens | Ultra-clean enterprise SaaS aesthetic with responsive mobile drawer navigation and dark/light accents. |
| **Database & Auth** | Supabase (PostgreSQL 15+) | Enterprise ACID-compliant relational database with Row Level Security (RLS) and cryptographic JWT auth. |
| **Transactional Integrity**| PostgreSQL Stored Procedures (PL/pgSQL) | Atomic execution of leave deductions, rollbacks on rejection, and overlap prevention at the database level. |
| **Form Validation** | Zod | Unified client and server schema validation preventing malformed payloads. |
| **Visualizations** | Recharts | Responsive, interactive SVG charts for leave analytics. |

---

## 📂 Project Structure

```
leave-management-system/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx             # Corporate login with Quick Demo presets
│   │   └── register/page.tsx          # Employee self-registration
│   ├── (dashboard)/
│   │   ├── employee/
│   │   │   ├── dashboard/page.tsx     # Hero banner, balance cards, recent requests
│   │   │   ├── apply/page.tsx         # Leave application form with policy guidance
│   │   │   ├── history/page.tsx       # Filterable leave history and audit view
│   │   │   └── profile/page.tsx       # Profile editor & annual allocations
│   │   └── admin/
│   │       ├── dashboard/page.tsx     # Executive metrics & analytics charts
│   │       ├── leaves/page.tsx        # Approval queue with decision modals
│   │       ├── employees/page.tsx     # Staff directory with leave inspection
│   │       └── allocations/page.tsx   # Leave quota matrix and adjustments
│   ├── api/
│   │   └── auth/callback/route.ts     # Supabase OAuth/code exchange
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                       # Smart route dispatcher
├── components/
│   ├── ui/                            # Button, Card, Badge, Dialog, Table, Input, Toast
│   ├── common/                        # Sidebar, Navbar, DashboardShell
│   ├── employee/                      # BalanceCards, LeaveApplyForm, LeaveHistoryTable
│   └── admin/                         # LeaveApprovalModal, LeaveAnalyticsChart, EmployeeRosterTable, LeaveAllocationModal
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Browser Supabase client
│   │   ├── server.ts                  # Server-side Supabase client with cookies
│   │   └── middleware.ts              # Route protection and RBAC guards
│   ├── validations/
│   │   ├── auth.ts                    # Zod login & registration schemas
│   │   └── leave.ts                   # Zod leave application & allocation schemas
│   └── utils.ts                       # Class merger, date formatters, working day calculators
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql     # Normalized tables, constraints, indexes
│   │   ├── 002_rls_policies.sql       # Comprehensive Row-Level Security
│   │   ├── 003_stored_procedures.sql  # PL/pgSQL atomic procedures & triggers
│   │   └── 004_seed_data.sql          # Default corporate leave types
│   └── full_schema.sql                # Complete one-click database initialization
├── middleware.ts                      # Edge session updater & role firewall
├── scripts/
│   └── test_logic.js                  # Automated test suite for business rules
├── README.md                          # Full technical documentation
└── BRD.md                             # Comprehensive Business Requirements Document
```

---

## ⚡ Quick Start & Setup Instructions

### 1. Clone & Install Dependencies
```bash
git clone <your-github-repo-url>
cd leave-management-system
npm install
```

### 2. Environment Variables Configuration
Copy `.env.example` to `.env.local` and configure your Supabase project credentials:
```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Initialization (Supabase)
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor**.
3. Open `supabase/full_schema.sql` from this repository.
4. Paste and execute the SQL script. This will automatically:
   - Create `profiles`, `leave_types`, `leave_balances`, `leave_requests`, and `leave_audit_logs`.
   - Configure Row-Level Security (RLS) policies.
   - Install atomic functions (`apply_for_leave`, `process_leave_action`, `handle_new_user`).
   - Seed default leave categories (`CL`, `SL`, `AL`, `UL`).

### 4. Provisioning the Admin Account
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/register` and register an account with email `admin@exelon.com`.
3. In the Supabase SQL Editor, run:
   ```sql
   UPDATE public.profiles
   SET role = 'admin',
       designation = 'HR Director',
       department = 'Human Resources'
   WHERE email = 'admin@exelon.com';
   ```

### 5. Run Verification Tests
```bash
node scripts/test_logic.js
```

### 6. Production Build
```bash
npm run build
npm start
```

---

## 🔒 Security & Authorization

- **Never Trust Frontend Roles:** The user's role is verified directly in PostgreSQL via `public.profiles`.
- **Row-Level Security (RLS):** Employees can only view/mutate their own requests and balances. Admins have managerial scope over all records.
- **Overlapping Leave Protection:** Database-level and client-level range queries prevent conflicting requests.
- **Atomic Balance Updates:** Stored procedures with row locking (`FOR UPDATE`) prevent race conditions during concurrent approval actions.

---

## 🚢 Deployment Guide

### Deploy to Vercel
1. Push your repository to **GitHub**.
2. Connect your GitHub repository to **Vercel** (`https://vercel.com`).
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Click **Deploy**. Vercel will build the project and issue a live production URL.

---

**Developed for Exelon Circuits Technical Assessment**
