"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  User,
  Users,
  CheckSquare,
  Sliders,
  LogOut,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  role: "employee" | "admin";
  userEmail?: string;
  userName?: string;
  onSignOut: () => void;
}

export function Sidebar({ role, userEmail, userName, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const employeeNavItems = [
    { name: "Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
    { name: "Apply Leave", href: "/employee/apply", icon: CalendarPlus },
    { name: "Leave History", href: "/employee/history", icon: History },
    { name: "My Profile", href: "/employee/profile", icon: User },
  ];

  const adminNavItems = [
    { name: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Leave Approvals", href: "/admin/leaves", icon: CheckSquare },
    { name: "Employee Directory", href: "/admin/employees", icon: Users },
    { name: "Leave Allocations", href: "/admin/allocations", icon: Sliders },
  ];

  const navItems = role === "admin" ? adminNavItems : employeeNavItems;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-wide text-white">Exelon Circuits</span>
          <span className="text-xs text-slate-400 font-medium">Leave Management</span>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between rounded-lg bg-slate-800/80 px-3 py-2 border border-slate-700/60">
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-slate-200 truncate">{userName || "User"}</span>
            <span className="text-[11px] text-slate-400 truncate">{userEmail}</span>
          </div>
          <Badge variant={role === "admin" ? "warning" : "info"} className="uppercase text-[10px] tracking-wider font-bold">
            {role}
          </Badge>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-900 text-white shadow-md focus:outline-none"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-20 shadow-xl">
        {sidebarContent}
      </aside>
    </>
  );
}
