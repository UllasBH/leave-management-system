"use client";

import React, { useState, useMemo } from "react";
import { Profile, LeaveBalance, LeaveRequest } from "@/types/database.types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, User, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface EmployeeRosterTableProps {
  employees: Profile[];
  balances: LeaveBalance[];
  requests: LeaveRequest[];
  isLoading?: boolean;
}

export function EmployeeRosterTable({
  employees,
  balances,
  requests,
  isLoading = false,
}: EmployeeRosterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<Profile | null>(null);
  const currentYear = new Date().getFullYear();

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const term = searchTerm.toLowerCase();
      const name = emp.full_name?.toLowerCase() || "";
      const email = emp.email?.toLowerCase() || "";
      const dept = emp.department?.toLowerCase() || "";
      return name.includes(term) || email.includes(term) || dept.includes(term);
    });
  }, [employees, searchTerm]);

  // Balances and requests for selected employee
  const empBalances = useMemo(() => {
    if (!selectedEmp) return [];
    return balances.filter((b) => b.user_id === selectedEmp.id);
  }, [selectedEmp, balances]);

  const empRequests = useMemo(() => {
    if (!selectedEmp) return [];
    return requests.filter((r) => r.user_id === selectedEmp.id);
  }, [selectedEmp, requests]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Search by name, email or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee Name</TableHead>
            <TableHead>Corporate Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                Loading employee directory...
              </TableCell>
            </TableRow>
          ) : filteredEmployees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                No employees matching criteria.
              </TableCell>
            </TableRow>
          ) : (
            filteredEmployees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold">
                    {emp.full_name?.charAt(0).toUpperCase() || "E"}
                  </div>
                  {emp.full_name}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">
                  {emp.email}
                </TableCell>
                <TableCell>{emp.department || "General"}</TableCell>
                <TableCell>{emp.designation || "Staff"}</TableCell>
                <TableCell>
                  <Badge variant={emp.role === "admin" ? "warning" : "secondary"}>
                    {emp.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEmp(emp)}
                    className="h-8 text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Inspect Leave Profile
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Selected Employee Deep-Dive Dialog */}
      {selectedEmp && (
        <Dialog open={!!selectedEmp} onOpenChange={() => setSelectedEmp(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {selectedEmp.full_name} — Leave & Quota Summary
            </DialogTitle>
            <DialogDescription>
              {selectedEmp.email} • {selectedEmp.department} • {selectedEmp.designation}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Balances Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Current Year Balances ({currentYear})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {empBalances.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      {b.leave_type?.name}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {Number(b.allocated_days) - (Number(b.used_days) + Number(b.pending_days))}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Used: {b.used_days} / {b.allocated_days}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Leave Request History ({empRequests.length})
              </h4>
              {empRequests.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center border rounded-lg">
                  No leave requests submitted by this employee yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {empRequests.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{r.leave_type?.name}</span>
                        <p className="text-slate-500 text-[11px]">
                          {formatDate(r.start_date)} - {formatDate(r.end_date)} ({r.total_days} days)
                        </p>
                      </div>
                      <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "destructive" : "warning"}>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmp(null)}>
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
