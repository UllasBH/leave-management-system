"use client";

import React, { useState } from "react";
import { Profile, LeaveType } from "@/types/database.types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Sliders, CheckCircle2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { leaveAllocationSchema } from "@/lib/validations/leave";
import { useToast } from "@/components/ui/toast";

interface LeaveAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Profile[];
  leaveTypes: LeaveType[];
  onSuccess: () => void;
}

export function LeaveAllocationModal({
  open,
  onOpenChange,
  employees,
  leaveTypes,
  onSuccess,
}: LeaveAllocationModalProps) {
  const { success, error: toastError } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>(employees[0]?.id || "");
  const [selectedTypeId, setSelectedTypeId] = useState<string>(leaveTypes[0]?.id || "");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [allocatedDays, setAllocatedDays] = useState<number>(12);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = leaveAllocationSchema.safeParse({
      userId: selectedUserId,
      leaveTypeId: selectedTypeId,
      year: Number(year),
      allocatedDays: Number(allocatedDays),
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Invalid input data");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("leave_balances").upsert(
        {
          user_id: selectedUserId,
          leave_type_id: selectedTypeId,
          year: Number(year),
          allocated_days: Number(allocatedDays),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,leave_type_id,year" }
      );

      if (error) throw error;

      success("Leave balance quota successfully updated!");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update allocation";
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-blue-600" />
          Adjust Leave Allocation Quota
        </DialogTitle>
        <DialogDescription>
          Assign or update the annual leave balance quota for an individual employee.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMsg && (
          <Alert variant="destructive" title="Error">
            {errorMsg}
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="userId" required>Select Employee</Label>
          <Select
            id="userId"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.email}) - {emp.department || "General"}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="typeId" required>Leave Type</Label>
          <Select
            id="typeId"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
          >
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name} ({lt.code})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="year" required>Year</Label>
            <Input
              id="year"
              type="number"
              min={2024}
              max={2035}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="allocatedDays" required>Allocated Days</Label>
            <Input
              id="allocatedDays"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={allocatedDays}
              onChange={(e) => setAllocatedDays(Number(e.target.value))}
            />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 font-semibold"
            isLoading={isSubmitting}
          >
            Save Allocation
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
