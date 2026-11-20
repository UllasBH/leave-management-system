"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { EmployeeRosterTable } from "@/components/admin/EmployeeRosterTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveBalance, LeaveRequest } from "@/types/database.types";

export default function AdminEmployeesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
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

      // Fetch all employees
      const { data: empData } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (empData) setEmployees(empData);

      // Fetch all current balances
      const { data: balData } = await supabase
        .from("leave_balances")
        .select("*, leave_type:leave_types(*)")
        .eq("year", new Date().getFullYear());
      if (balData) setBalances(balData);

      // Fetch all requests
      const { data: reqData } = await supabase
        .from("leave_requests")
        .select("*, leave_type:leave_types(*)")
        .order("created_at", { ascending: false });
      if (reqData) setRequests(reqData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DashboardShell
      role="admin"
      userName={profile?.full_name || "Admin"}
      userEmail={profile?.email || ""}
      pageTitle="Employee Directory"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Company Staff Directory
            </h2>
            <p className="text-sm text-slate-500">
              Manage employee accounts, inspect individual leave quotas, and review departmental rosters.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6">
            <EmployeeRosterTable
              employees={employees}
              balances={balances}
              requests={requests}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
