"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { LeaveApplyForm } from "@/components/employee/LeaveApplyForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Info, CheckCircle2, ShieldAlert, Sparkles, BookOpen } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveBalance, LeaveRequest, LeaveType } from "@/types/database.types";

export default function EmployeeApplyPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [existingRequests, setExistingRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApplyData() {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profData) setProfile(profData);

        // Fetch types
        const { data: typesData } = await supabase
          .from("leave_types")
          .select("*")
          .eq("is_active", true);
        if (typesData) setLeaveTypes(typesData);

        // Fetch balances
        const { data: balData } = await supabase
          .from("leave_balances")
          .select("*, leave_type:leave_types(*)")
          .eq("user_id", user.id)
          .eq("year", new Date().getFullYear());
        if (balData) setBalances(balData);

        // Fetch existing requests for overlap validation
        const { data: reqData } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("user_id", user.id);
        if (reqData) setExistingRequests(reqData);
      } finally {
        setIsLoading(false);
      }
    }

    loadApplyData();
  }, []);

  return (
    <DashboardShell
      role="employee"
      userName={profile?.full_name || "Employee"}
      userEmail={profile?.email || ""}
      pageTitle="Apply for Leave"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Request Time Off
          </h2>
          <p className="text-sm text-slate-500">
            Fill in the details below to submit a formal leave request to HR & Management.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {!isLoading && profile && (
              <LeaveApplyForm
                userId={profile.id}
                leaveTypes={leaveTypes}
                balances={balances}
                existingRequests={existingRequests}
              />
            )}
          </div>

          {/* Policy & Guidance Sidebar */}
          <div className="space-y-4">
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Exelon Circuits Leave Policy
                </CardTitle>
                <CardDescription>
                  Important guidelines before applying
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Casual Leave (CL):</strong> Max 3 consecutive days. Ideal for personal appointments or sudden errands.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Sick Leave (SL):</strong> Medical certificate required if requesting more than 2 consecutive days.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Annual Leave (AL):</strong> Plan ahead and apply at least 7 days in advance for schedule approval.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Working Days:</strong> Weekends (Saturday & Sunday) are automatically excluded from the deducted total.
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/40">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-semibold mb-0.5">Need immediate assistance?</p>
                  <p>
                    For emergency leave or unplanned situations, notify your reporting manager directly via corporate email or Slack.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
