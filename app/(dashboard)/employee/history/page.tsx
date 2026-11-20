"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/common/DashboardShell";
import { LeaveHistoryTable } from "@/components/employee/LeaveHistoryTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarPlus, History, RefreshCw } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveRequest } from "@/types/database.types";

export default function EmployeeHistoryPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
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
        .select("*, leave_type:leave_types(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (reqData) setRequests(reqData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return (
    <DashboardShell
      role="employee"
      userName={profile?.full_name || "Employee"}
      userEmail={profile?.email || ""}
      pageTitle="Leave History"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="h-6 w-6 text-blue-600" />
              Leave History & Status Tracking
            </h2>
            <p className="text-sm text-slate-500">
              Audit log of all your submitted leave applications, approvals, and reviews.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              disabled={isLoading}
              className="text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/employee/apply">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-semibold shadow-sm">
                <CalendarPlus className="h-4 w-4 mr-1.5" />
                New Application
              </Button>
            </Link>
          </div>
        </div>

        <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6">
            <LeaveHistoryTable
              requests={requests}
              onRefresh={loadRequests}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
