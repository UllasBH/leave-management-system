"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { LeaveAllocationModal } from "@/components/admin/LeaveAllocationModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sliders, Plus, Search, RefreshCw, Edit3 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveBalance, LeaveType } from "@/types/database.types";

export default function AdminAllocationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const displayYear = new Date().getFullYear();

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

      const { data: empData } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (empData) setEmployees(empData);

      const { data: typesData } = await supabase
        .from("leave_types")
        .select("*")
        .eq("is_active", true);
      if (typesData) setLeaveTypes(typesData);

      const { data: balData } = await supabase
        .from("leave_balances")
        .select("*, leave_type:leave_types(*)")
        .eq("year", new Date().getFullYear());
      if (balData) setBalances(balData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine employees and balances
  const enrichedList = useMemo(() => {
    const list: Array<{
      id: string;
      employee: Profile;
      balances: Record<string, LeaveBalance>;
    }> = [];

    employees.forEach((emp) => {
      const empBals = balances.filter((b) => b.user_id === emp.id);
      const balMap: Record<string, LeaveBalance> = {};
      empBals.forEach((b) => {
        if (b.leave_type?.code) balMap[b.leave_type.code] = b;
      });

      const term = searchTerm.toLowerCase();
      const name = emp.full_name?.toLowerCase() || "";
      const email = emp.email?.toLowerCase() || "";
      const dept = emp.department?.toLowerCase() || "";

      if (name.includes(term) || email.includes(term) || dept.includes(term)) {
        list.push({
          id: emp.id,
          employee: emp,
          balances: balMap,
        });
      }
    });

    return list;
  }, [employees, balances, searchTerm]);

  return (
    <DashboardShell
      role="admin"
      userName={profile?.full_name || "Admin"}
      userEmail={profile?.email || ""}
      pageTitle="Leave Allocations"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="h-6 w-6 text-blue-600" />
              Annual Leave Allocation Matrix ({displayYear})
            </h2>
            <p className="text-sm text-slate-500">
              Configure and grant customized annual leave entitlements for employees.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow-sm"
              disabled={employees.length === 0}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adjust Quota
            </Button>
          </div>
        </div>

        <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="Search employee or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Casual Leave (CL)</TableHead>
                  <TableHead className="text-center">Sick Leave (SL)</TableHead>
                  <TableHead className="text-center">Annual Leave (AL)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Loading allocation matrix...
                    </TableCell>
                  </TableRow>
                ) : enrichedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrichedList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.employee.full_name}
                        <span className="block text-xs font-normal text-slate-500">{item.employee.email}</span>
                      </TableCell>
                      <TableCell>{item.employee.department || "General"}</TableCell>
                      <TableCell className="text-center font-medium">
                        {item.balances["CL"] ? `${item.balances["CL"].allocated_days} days` : "12 days (Default)"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.balances["SL"] ? `${item.balances["SL"].allocated_days} days` : "10 days (Default)"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.balances["AL"] ? `${item.balances["AL"].allocated_days} days` : "15 days (Default)"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsModalOpen(true)}
                          className="h-8 text-blue-600 hover:text-blue-700"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Adjust
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

      {employees.length > 0 && leaveTypes.length > 0 && (
        <LeaveAllocationModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          employees={employees}
          leaveTypes={leaveTypes}
          onSuccess={loadData}
        />
      )}
    </DashboardShell>
  );
}
