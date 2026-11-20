"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LeaveType, LeaveBalance, LeaveRequest } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { calculateWorkingDays } from "@/lib/utils";
import { leaveApplicationSchema } from "@/lib/validations/leave";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

interface LeaveApplyFormProps {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  existingRequests?: LeaveRequest[];
  onSuccess?: () => void;
}

export function LeaveApplyForm({
  leaveTypes,
  balances,
  existingRequests = [],
  onSuccess,
}: LeaveApplyFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [leaveTypeId, setLeaveTypeId] = useState<string>(leaveTypes[0]?.id || "");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Selected balance & leave type calculation
  const selectedBalance = useMemo(() => {
    return balances.find((b) => b.leave_type_id === leaveTypeId);
  }, [balances, leaveTypeId]);

  const selectedType = useMemo(() => {
    return leaveTypes.find((lt) => lt.id === leaveTypeId);
  }, [leaveTypes, leaveTypeId]);

  const availableDays = useMemo(() => {
    if (!selectedBalance) return 0;
    return Number(selectedBalance.allocated_days) - (Number(selectedBalance.used_days) + Number(selectedBalance.pending_days));
  }, [selectedBalance]);

  // Working days calculation
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    return calculateWorkingDays(start, end);
  }, [startDate, endDate]);

  // Client-side date overlap detector
  const overlapConflict = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const conflicting = existingRequests.find((req) => {
      if (req.status !== "pending" && req.status !== "approved") return false;
      const reqStart = new Date(req.start_date);
      const reqEnd = new Date(req.end_date);
      return start <= reqEnd && end >= reqStart;
    });

    return conflicting;
  }, [startDate, endDate, existingRequests]);

  const isInsufficient = selectedType?.code !== "UL" && calculatedDays > availableDays;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // 1. Zod Validation
    const validation = leaveApplicationSchema.safeParse({
      leaveTypeId,
      startDate,
      endDate,
      reason,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (calculatedDays <= 0) {
      setErrors({ endDate: "Selected date range does not contain any working days (weekends excluded)." });
      return;
    }

    if (isInsufficient) {
      setServerError(`Insufficient leave balance. You requested ${calculatedDays} days, but only have ${availableDays} days remaining.`);
      return;
    }

    if (overlapConflict) {
      setServerError(`Date conflict: You already have a ${overlapConflict.status} leave request from ${overlapConflict.start_date} to ${overlapConflict.end_date}.`);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const supabase = createBrowserClient();

      // Invoke the hardened atomic PL/pgSQL stored procedure
      const { error } = await supabase.rpc("apply_for_leave", {
        p_leave_type_id: leaveTypeId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_reason: reason,
      });

      if (error) {
        throw error;
      }

      success("Leave application submitted successfully for review!");
      setStartDate("");
      setEndDate("");
      setReason("");

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/employee/history");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit leave request.";
      setServerError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-md border-slate-200/90 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Apply for Leave
        </CardTitle>
        <CardDescription>
          Submit a new time-off request. Leave days exclude weekends automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {serverError && (
          <Alert variant="destructive" title="Application Error">
            {serverError}
          </Alert>
        )}

        {overlapConflict && (
          <Alert variant="warning" title="Potential Date Conflict Detected">
            You already have a <strong>{overlapConflict.status}</strong> leave request scheduled from{" "}
            {overlapConflict.start_date} to {overlapConflict.end_date}.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Leave Type Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="leaveTypeId" required>Leave Category</Label>
              {selectedType && (
                <span className="text-xs font-semibold text-slate-500">
                  Available Balance:{" "}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {selectedType.code === "UL" ? "Unlimited" : `${Math.max(0, availableDays)} days`}
                  </strong>
                </span>
              )}
            </div>
            <Select
              id="leaveTypeId"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              error={errors.leaveTypeId}
            >
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.code})
                </option>
              ))}
            </Select>
            {selectedType?.description && (
              <p className="text-xs text-slate-500">{selectedType.description}</p>
            )}
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" required>Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                error={errors.startDate}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate" required>End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setEndDate(e.target.value)}
                error={errors.endDate}
              />
            </div>
          </div>

          {/* Working Days Calculation Summary Banner */}
          {startDate && endDate && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Duration: {calculatedDays} Working {calculatedDays === 1 ? "Day" : "Days"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Excludes Saturdays & Sundays
                  </p>
                </div>
              </div>

              {isInsufficient ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Exceeds Available Balance ({availableDays} days)
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Within Balance
                </div>
              )}
            </div>
          )}

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" required>Reason for Leave</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Please provide details regarding the reason for your time off..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={errors.reason}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
            isLoading={isLoading}
            disabled={isInsufficient || !!overlapConflict || calculatedDays <= 0}
          >
            Submit Leave Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
