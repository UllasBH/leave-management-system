"use client";

import React, { useState, useMemo } from "react";
import { LeaveRequest } from "@/types/database.types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, XCircle, Calendar } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

interface LeaveHistoryTableProps {
  requests: LeaveRequest[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function LeaveHistoryTable({
  requests,
  onRefresh,
  isLoading = false,
}: LeaveHistoryTableProps) {
  const { success, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const typeName = req.leave_type?.name?.toLowerCase() || "";
      const reasonText = req.reason.toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = typeName.includes(term) || reasonText.includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this pending leave request?")) {
      return;
    }

    setIsCancelling(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.rpc("cancel_leave_request", {
        p_request_id: requestId,
      });

      if (error) throw error;

      success("Leave request cancelled successfully.");
      if (onRefresh) onRefresh();
      setSelectedRequest(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel request";
      toastError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const renderStatusBadge = (status: string) => {
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
    <div className="space-y-4">
      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search by category or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
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
            <TableHead>Leave Type</TableHead>
            <TableHead>Date Range</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Applied On</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                Loading leave records...
              </TableCell>
            </TableRow>
          ) : filteredRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Calendar className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    No leave requests found.
                  </p>
                  <p className="text-xs text-slate-400">
                    Apply for leave to see your history logged here.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredRequests.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                  {req.leave_type?.name || "General Leave"}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">
                  {formatDate(req.start_date)} - {formatDate(req.end_date)}
                </TableCell>
                <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                  {req.total_days} {Number(req.total_days) === 1 ? "day" : "days"}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {formatDate(req.created_at)}
                </TableCell>
                <TableCell>{renderStatusBadge(req.status)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRequest(req)}
                    className="h-8 px-2 text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  {req.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelRequest(req.id)}
                      disabled={isCancelling}
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Submission ID: <span className="font-mono text-xs">{selectedRequest.id}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/70">
              <div>
                <span className="text-xs text-slate-500 block">Category</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedRequest.leave_type?.name}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Status</span>
                <div className="pt-0.5">{renderStatusBadge(selectedRequest.status)}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Date Range</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Working Days</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedRequest.total_days} Days
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Reason Stated:
              </span>
              <p className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                {selectedRequest.reason}
              </p>
            </div>

            {selectedRequest.admin_comment && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Manager Feedback / Comment:
                </span>
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  {selectedRequest.admin_comment}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>Applied: {formatDateTime(selectedRequest.created_at)}</span>
              {selectedRequest.actioned_at && (
                <span>Actioned: {formatDateTime(selectedRequest.actioned_at)}</span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
            {selectedRequest.status === "pending" && (
              <Button
                variant="destructive"
                onClick={() => handleCancelRequest(selectedRequest.id)}
                disabled={isCancelling}
              >
                Cancel Request
              </Button>
            )}
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
