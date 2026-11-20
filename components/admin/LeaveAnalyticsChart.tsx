"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LeaveRequest } from "@/types/database.types";

interface LeaveAnalyticsProps {
  requests: LeaveRequest[];
}

export function LeaveAnalyticsChart({ requests }: LeaveAnalyticsProps) {
  // 1. Group requests by leave category
  const categoryCounts: Record<string, number> = {
    "Casual Leave": 0,
    "Sick Leave": 0,
    "Annual Leave": 0,
    "Unpaid Leave": 0,
  };

  // 2. Status counts
  let approvedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;

  requests.forEach((r) => {
    const typeName = r.leave_type?.name || "Other";
    if (categoryCounts[typeName] !== undefined) {
      categoryCounts[typeName] += Number(r.total_days);
    } else {
      categoryCounts[typeName] = Number(r.total_days);
    }

    if (r.status === "approved") approvedCount++;
    else if (r.status === "rejected") rejectedCount++;
    else if (r.status === "pending") pendingCount++;
  });

  const barData = Object.entries(categoryCounts).map(([name, days]) => ({
    name,
    days,
  }));

  const pieData = [
    { name: "Approved", value: approvedCount, color: "#10b981" },
    { name: "Pending", value: pendingCount, color: "#f59e0b" },
    { name: "Rejected", value: rejectedCount, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const fallbackPie = [
    { name: "No Data", value: 1, color: "#cbd5e1" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Bar Chart */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Days Requested by Category</CardTitle>
          <CardDescription>
            Cumulative working days applied across all leave types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [`${val} Days`, "Total Requested"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="days" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution Pie Chart */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Leave Request Approval Ratio</CardTitle>
          <CardDescription>
            Proportion of approved, pending, and rejected submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : fallbackPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                >
                  {(pieData.length > 0 ? pieData : fallbackPie).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} requests`, name]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
