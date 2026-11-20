"use client";

import React, { useEffect, useState } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User, Mail, Building, Briefcase, Save, Calendar } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Profile, LeaveBalance } from "@/types/database.types";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function EmployeeProfilePage() {
  const { success, error: toastError } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profData) {
          setProfile(profData);
          setFullName(profData.full_name || "");
          setDepartment(profData.department || "");
          setDesignation(profData.designation || "");
        }

        const { data: balData } = await supabase
          .from("leave_balances")
          .select("*, leave_type:leave_types(*)")
          .eq("user_id", user.id)
          .eq("year", new Date().getFullYear());

        if (balData) setBalances(balData);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          department: department,
          designation: designation,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      success("Profile details updated successfully!");
      setProfile((prev) => (prev ? { ...prev, full_name: fullName, department, designation } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      toastError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell
      role="employee"
      userName={profile?.full_name || "Employee"}
      userEmail={profile?.email || ""}
      pageTitle="My Profile"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            Employee Profile & Entitlements
          </h2>
          <p className="text-sm text-slate-500">
            View and manage your organizational details and current leave balance allocations.
          </p>
          {isLoading && <p role="status" className="text-sm text-slate-500">Loading profile...</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Quick Profile Card */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm text-center p-6 space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-2xl shadow-inner">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {profile?.full_name || "Employee"}
              </h3>
              <p className="text-xs text-slate-500">{profile?.email}</p>
            </div>
            <div className="flex justify-center">
              <Badge variant="info" className="uppercase tracking-wider text-[11px] font-bold">
                {profile?.role || "employee"}
              </Badge>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-left text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Employee ID:</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  {profile?.id.substring(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span>Joined On:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(profile?.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Company:</span>
                <span className="font-semibold text-blue-600">Exelon Circuits</span>
              </div>
            </div>
          </Card>

          {/* Right Column: Edit Profile Form */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Personal & Job Information</CardTitle>
                <CardDescription>
                  Keep your work contact and department details up to date.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" required>Full Name</Label>
                    <div className="relative">
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9"
                        required
                      />
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address (Read-only)</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        value={profile?.email || ""}
                        disabled
                        className="pl-9 bg-slate-50 dark:bg-slate-800/60"
                      />
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="department">Department</Label>
                      <div className="relative">
                        <Input
                          id="department"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="pl-9"
                        />
                        <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="designation">Designation</Label>
                      <div className="relative">
                        <Input
                          id="designation"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="pl-9"
                        />
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-slate-100 p-4">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 font-semibold"
                    isLoading={isSaving}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Leave Entitlement Breakdown Table */}
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Annual Leave Entitlement Breakdown ({currentYear})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {balances.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {b.leave_type?.name} ({b.leave_type?.code})
                        </span>
                        <p className="text-xs text-slate-500">{b.leave_type?.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {b.allocated_days} days
                        </span>
                        <span className="text-xs text-slate-500 block">
                          Allocated for Year
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
