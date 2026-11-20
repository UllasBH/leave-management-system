export type UserRole = "employee" | "admin";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  designation: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string; // CL, SL, AL, UL
  description: string | null;
  default_days_per_year: number;
  is_active: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  admin_comment: string | null;
  actioned_by: string | null;
  actioned_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  leave_type?: LeaveType;
  actioner?: Profile | null;
}

export interface LeaveAuditLog {
  id: string;
  leave_request_id: string;
  action: "created" | "approved" | "rejected" | "cancelled" | "balance_adjusted";
  performed_by: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  performer?: Profile;
}
