"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/common/DashboardShell";
import { BalanceCards } from "@/components/employee/BalanceCards";
import { LeaveHistoryTable } from "@/components/employee/LeaveHistoryTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarPlus, ArrowRight, Sparkles } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveBalance, LeaveRequest } from "@/types/database.types";

export default function EmployeeDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  const fetchDashboardData = useCallback(async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      setIsLoading(true);
      setLoadError(null);
      const { data: profData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profData);

      const { data: balData, error: balanceError } = await supabase
        .from("leave_balances")
        .select("*, leave_type:leave_types(*)")
        .eq("user_id", user.id)
        .eq("year", currentYear);
      if (balanceError) throw balanceError;
      setBalances(balData);

      const { data: reqData, error: requestError } = await supabase
        .from("leave_requests")
        .select("*, leave_type:leave_types(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (requestError) throw requestError;
      setRequests(reqData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load your dashboard data.";
      setLoadError(message);
      setProfile(null);
      setBalances([]);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    void Promise.resolve().then(fetchDashboardData);
  }, [fetchDashboardData]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <DashboardShell
      role="employee"
      userName={profile?.full_name || "Employee"}
      userEmail={profile?.email || ""}
      pageTitle="Employee Portal"
    >
      <div className="space-y-8">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Exelon Circuits Leave Management</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Welcome back, {profile?.full_name || "Colleague"}!
              </h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                Review your current leave allocations, check pending approvals, or schedule upcoming time off.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/employee/apply">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-md">
                  <CalendarPlus className="mr-2 h-5 w-5" />
                  Apply for Leave
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Leave Balances Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Leave Balances ({currentYear})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Refreshed automatically on submission
            </span>
          </div>
          {loadError && (
            <p role="alert" className="text-sm text-red-600">
              {loadError}
            </p>
          )}
          <BalanceCards balances={balances} isLoading={isLoading} />
          {!isLoading && !loadError && balances.length === 0 && (
            <p className="text-sm text-slate-500">
              No leave balances were found for this year. Please contact your administrator.
            </p>
          )}
        </div>

        {/* Recent Leave Requests Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Recent Leave Submissions
              </h3>
              <p className="text-xs text-slate-500">
                You have {pendingCount} pending and {approvedCount} approved requests this cycle.
              </p>
            </div>
            <Link href="/employee/history">
              <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700">
                View All History
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <LeaveHistoryTable
                requests={requests.slice(0, 5)}
                onRefresh={fetchDashboardData}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
