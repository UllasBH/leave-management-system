import { z } from "zod";

export const leaveApplicationSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Please select a leave category"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z
      .string()
      .min(5, "Please provide a reason with at least 5 characters")
      .max(500, "Reason cannot exceed 500 characters"),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export type LeaveApplicationInput = z.infer<typeof leaveApplicationSchema>;

export const leaveApprovalSchema = z
  .object({
    requestId: z.string().uuid("Invalid request ID"),
    status: z.enum(["approved", "rejected"]),
    adminComment: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "rejected" && (!data.adminComment || data.adminComment.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "A rejection comment is mandatory when rejecting a leave request",
      path: ["adminComment"],
    }
  );

export type LeaveApprovalInput = z.infer<typeof leaveApprovalSchema>;

export const leaveAllocationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  leaveTypeId: z.string().uuid("Invalid leave type ID"),
  year: z.number().int().min(2020).max(2050),
  allocatedDays: z.number().min(0, "Allocated days cannot be negative").max(365),
});

export type LeaveAllocationInput = z.infer<typeof leaveAllocationSchema>;
