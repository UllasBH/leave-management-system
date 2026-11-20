"use client";

import React, { useState } from "react";
import { LeaveRequest } from "@/types/database.types";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

interface LeaveApprovalModalProps {
  request: LeaveRequest | null;
  adminId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LeaveApprovalModal({
  request,
  open,
  onOpenChange,
  onSuccess,
}: LeaveApprovalModalProps) {
  const { success, error: toastError } = useToast();
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);

  if (!request) return null;

  const handleAction = async (action: "approved" | "rejected") => {
    setCommentError(null);

    // If rejecting, comment is strictly mandatory
    if (action === "rejected" && (!comment || comment.trim().length === 0)) {
      setCommentError("A rejection comment is mandatory to inform the employee why the leave was denied.");
      return;
    }

    setIsProcessing(true);
    setActionType(action);

    try {
      const supabase = createBrowserClient();

      // Call hardened PL/pgSQL atomic procedure
      const { error } = await supabase.rpc("process_leave_action", {
        p_request_id: request.id,
        p_action: action,
        p_comment: comment.trim() || null,
      });

      if (error) {
        throw error;
      }

      success(`Leave request successfully ${action}!`);
      onOpenChange(false);
      setComment("");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process leave action.";
      toastError(msg);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Review Leave Request
        </DialogTitle>
        <DialogDescription>
          Applicant: <strong className="text-slate-800 dark:text-slate-200">{request.profile?.full_name || "Employee"}</strong> ({request.profile?.department || "Department"})
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 text-sm">
        {/* Summary Card */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-xs text-slate-500 block">Category</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {request.leave_type?.name}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Requested Duration</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {request.total_days} Working {Number(request.total_days) === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-slate-500 block">Date Range</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatDate(request.start_date)} through {formatDate(request.end_date)}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Employee&apos;s Stated Reason:
          </span>
          <p className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm">
            {request.reason}
          </p>
        </div>

        {/* Manager Comment Input */}
        <div className="space-y-1.5">
          <Label htmlFor="adminComment">
            Administrative Comment / Feedback{" "}
            <span className="text-xs font-normal text-slate-400">(Required only upon rejection)</span>
          </Label>
          <Textarea
            id="adminComment"
            rows={3}
            placeholder="Add comments or state reason for rejection..."
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (commentError) setCommentError(null);
            }}
            error={commentError || undefined}
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={() => handleAction("rejected")}
            isLoading={isProcessing && actionType === "rejected"}
            disabled={isProcessing}
          >
            <X className="mr-1.5 h-4 w-4" />
            Reject Request
          </Button>
          <Button
            variant="success"
            onClick={() => handleAction("approved")}
            isLoading={isProcessing && actionType === "approved"}
            disabled={isProcessing}
          >
            <Check className="mr-1.5 h-4 w-4" />
            Approve Request
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
