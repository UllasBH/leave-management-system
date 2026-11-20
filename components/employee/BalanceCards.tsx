"use client";

import React from "react";
import { LeaveBalance } from "@/types/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, HeartPulse, Palmtree, Clock } from "lucide-react";

interface BalanceCardsProps {
  balances: LeaveBalance[];
  isLoading?: boolean;
}

export function BalanceCards({ balances, isLoading = false }: BalanceCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 h-36" />
        ))}
      </div>
    );
  }

  const getLeaveIcon = (code: string) => {
    switch (code) {
      case "SL":
        return <HeartPulse className="h-5 w-5 text-amber-600" />;
      case "AL":
        return <Palmtree className="h-5 w-5 text-blue-600" />;
      case "UL":
        return <Clock className="h-5 w-5 text-purple-600" />;
      case "CL":
      default:
        return <Calendar className="h-5 w-5 text-emerald-600" />;
    }
  };

  const getBadgeColors = (code: string) => {
    switch (code) {
      case "SL":
        return { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
      case "AL":
        return { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", bar: "bg-blue-600" };
      case "UL":
        return { bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", bar: "bg-purple-500" };
      case "CL":
      default:
        return { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {balances.map((b) => {
        const code = b.leave_type?.code || "CL";
        const name = b.leave_type?.name || "Leave";
        const available = Number(b.allocated_days) - (Number(b.used_days) + Number(b.pending_days));
        const colors = getBadgeColors(code);
        const percentUsed = Number(b.allocated_days) > 0
          ? Math.min(100, Math.round(((Number(b.used_days) + Number(b.pending_days)) / Number(b.allocated_days)) * 100))
          : 0;

        return (
          <Card key={b.id} className="relative overflow-hidden transition-all hover:shadow-md border-slate-200/90 dark:border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {name}
                  </span>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {code === "UL" ? "Unlimited" : Math.max(0, available)}
                    </span>
                    {code !== "UL" && (
                      <span className="text-xs text-slate-500 font-medium">days left</span>
                    )}
                  </div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${colors.bg} ${colors.border}`}>
                  {getLeaveIcon(code)}
                </div>
              </div>

              {code !== "UL" && (
                <div className="mt-4 space-y-2">
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>

                  {/* Sub breakdown */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span>Used: <strong className="text-slate-700 dark:text-slate-200">{b.used_days}</strong></span>
                    {Number(b.pending_days) > 0 && (
                      <span>Pending: <strong className="text-amber-600">{b.pending_days}</strong></span>
                    )}
                    <span>Total: <strong className="text-slate-700 dark:text-slate-200">{b.allocated_days}</strong></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
