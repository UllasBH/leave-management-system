"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { LeaveApprovalModal } from "@/components/admin/LeaveApprovalModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, Search, RefreshCw, Eye, CheckCircle2, Clock, XCircle } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveRequest } from "@/types/database.types";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function AdminLeavesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profData) setProfile(profData);

      const { data: reqData } = await supabase
        .from("leave_requests")
        .select("*, profile:profiles(*), leave_type:leave_types(*)")
        .order("created_at", { ascending: false });

      if (reqData) setRequests(reqData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const empName = r.profile?.full_name?.toLowerCase() || "";
      const dept = r.profile?.department?.toLowerCase() || "";
      const reason = r.reason?.toLowerCase() || "";
      const typeName = r.leave_type?.name?.toLowerCase() || "";
      const term = searchTerm.toLowerCase();

      const matchesSearch =
        empName.includes(term) ||
        dept.includes(term) ||
        reason.includes(term) ||
        typeName.includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

  const renderBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      case "pending":
      default:
        return <Badge variant="warning">Pending Review</Badge>;
    }
  };

  return (
    <DashboardShell
      role="admin"
      userName={profile?.full_name || "Admin"}
      userEmail={profile?.email || ""}
      pageTitle="Leave Management & Approvals"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-blue-600" />
              Leave Requests & Approval Queue
            </h2>
            <p className="text-sm text-slate-500">
              Review, approve, or reject employee leave applications across the organization.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900 self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Input
                  placeholder="Search by employee, department or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {["all", "pending", "approved", "rejected", "cancelled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === st
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Loading leave requests...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      No requests found matching the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {req.profile?.full_name || "Employee"}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {req.profile?.department || "General"}
                      </TableCell>
                      <TableCell>{req.leave_type?.name}</TableCell>
                      <TableCell>
                        {formatDate(req.start_date)} - {formatDate(req.end_date)}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                        {req.total_days} days
                      </TableCell>
                      <TableCell>{renderBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={req.status === "pending" ? "default" : "outline"}
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsModalOpen(true);
                          }}
                          className={req.status === "pending" ? "bg-blue-600 hover:bg-blue-700 h-8" : "h-8"}
                        >
                          {req.status === "pending" ? "Review & Decide" : "Inspect"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {profile && (
        <LeaveApprovalModal
          request={selectedRequest}
          adminId={profile.id}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={loadRequests}
        />
      )}
    </DashboardShell>
  );
}
