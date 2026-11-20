"use client";

import React from "react";
import { User, ShieldCheck } from "lucide-react";

interface NavbarProps {
  userName?: string;
  userEmail?: string;
  role: "employee" | "admin";
  title?: string;
}

export function Navbar({ userName, userEmail, role, title }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center gap-4 pl-12 lg:pl-0">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title || "Portal"}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold text-sm">
            {role === "admin" ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </div>
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{userName || "User"}</span>
            <span className="text-[11px] text-slate-500">{userEmail}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
