"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/common/DashboardShell";
import { LeaveAnalyticsChart } from "@/components/admin/LeaveAnalyticsChart";
import { LeaveApprovalModal } from "@/components/admin/LeaveApprovalModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckSquare,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveRequest, LeaveBalance, LeaveType } from "@/types/database.types";
import { formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Admin Profile
      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profData) setProfile(profData);

      // 2. Fetch All Requests with Profile and Leave Type joins
      const { data: reqData } = await supabase
        .from("leave_requests")
        .select("*, profile:profiles(*), leave_type:leave_types(*)")
        .order("created_at", { ascending: false });
      if (reqData) setRequests(reqData);

      // 3. Fetch All Employees
      const { data: empData } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (empData) setEmployees(empData);
    } catch (err) {
      console.error("Error loading admin dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");
  const totalDaysApproved = approvedRequests.reduce((acc, r) => acc + Number(r.total_days), 0);

  return (
    <DashboardShell
      role="admin"
      userName={profile?.full_name || "Admin"}
      userEmail={profile?.email || ""}
      pageTitle="Managerial Overview"
    >
      <div className="space-y-8">
        {/* Admin Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Executive Management Control</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Welcome, {profile?.full_name || "Administrator"}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Centralized oversight for employee leave approvals, company absenteeism analytics, and annual quota allocations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAdminData}
                disabled={isLoading}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                Refresh Data
              </Button>
              <Link href="/admin/leaves">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 font-semibold shadow-md text-white">
                  <CheckSquare className="mr-1.5 h-4 w-4" />
                  Review Approvals ({pendingRequests.length})
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Executive Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pending Approvals
                </p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">
                  {pendingRequests.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Requires manager review</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Staff
                </p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {employees.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Registered employee profiles</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Approved Leaves
                </p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                  {approvedRequests.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{totalDaysApproved} days consumed</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rejection Rate
                </p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {requests.length > 0
                    ? `${Math.round((rejectedRequests.length / requests.length) * 100)}%`
                    : "0%"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{rejectedRequests.length} rejected</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200">
                <XCircle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Queue Card */}
        <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Urgent Action Queue: Pending Leaves ({pendingRequests.length})
              </CardTitle>
              <CardDescription>
                Submissions awaiting your review and approval
              </CardDescription>
            </div>
            <Link href="/admin/leaves">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      All caught up! No pending leave requests at this moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.slice(0, 5).map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {req.profile?.full_name || "Employee"}
                      </TableCell>
                      <TableCell>{req.profile?.department || "General"}</TableCell>
                      <TableCell>{req.leave_type?.name}</TableCell>
                      <TableCell>
                        {formatDate(req.start_date)} - {formatDate(req.end_date)}
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">
                        {req.total_days} days
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsModalOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8"
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Analytics Charts */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Company Leave Analytics & Trends
          </h3>
          <LeaveAnalyticsChart requests={requests} />
        </div>
      </div>

      {/* Review Modal */}
      {profile && (
        <LeaveApprovalModal
          request={selectedRequest}
          adminId={profile.id}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={loadAdminData}
        />
      )}
    </DashboardShell>
  );
}
