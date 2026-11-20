"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

interface DashboardShellProps {
  children: React.ReactNode;
  role: "employee" | "admin";
  userEmail?: string;
  userName?: string;
  pageTitle?: string;
}

export function DashboardShell({
  children,
  role,
  userEmail,
  userName,
  pageTitle,
}: DashboardShellProps) {
  const router = useRouter();
  const { info } = useToast();

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      info("Signed out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Sidebar
        role={role}
        userEmail={userEmail}
        userName={userName}
        onSignOut={handleSignOut}
      />
      <div className="flex flex-col flex-1 lg:pl-64">
        <Navbar
          userName={userName}
          userEmail={userEmail}
          role={role}
          title={pageTitle}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
