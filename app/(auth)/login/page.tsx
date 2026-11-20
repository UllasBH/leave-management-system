"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";
import { useToast } from "@/components/ui/toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(() => {
    switch (searchParams.get("error")) {
      case "authentication_unavailable":
        return "Authentication is temporarily unavailable. Verify Supabase configuration and try again.";
      case "authentication_required":
        return "Please sign in to continue.";
      case "profile_unavailable":
        return "Your user profile could not be loaded. Please contact an administrator.";
      case "auth_callback_failed":
        return "Sign-in could not be completed. Please try again.";
      default:
        return null;
    }
  });

  const [selectedRole, setSelectedRole] = useState<"employee" | "admin">("employee");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // 1. Zod Validation
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setServerError(error.message);
        toastError(error.message);
        return;
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", data.user.id)
          .single();

        if (
          profileError ||
          !profile ||
          (profile.role !== "admin" && profile.role !== "employee")
        ) {
          const message = profileError?.message || "Your user profile could not be found.";
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            console.error("Could not clear session after profile lookup failure:", signOutError);
          }
          throw new Error(message);
        }

        const role = profile.role;
        const defaultRoute = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
        const canUseRedirect =
          redirectTo?.startsWith("/admin/") && role === "admin" ||
          redirectTo?.startsWith("/employee/") && role === "employee";

        success(`Welcome back, ${profile.full_name || "User"}!`);
        router.replace(canUseRedirect && redirectTo ? redirectTo : defaultRoute);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setServerError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/70 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exelon Circuits</h1>
          <p className="text-sm text-slate-500">Enterprise Leave Management System</p>
        </div>

        <Card className="shadow-xl border-slate-200/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your corporate credentials to access your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {serverError && (
              <Alert variant="destructive" title="Authentication Error">
                {serverError}
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                <button
    type="button"
    onClick={() => setSelectedRole("employee")}
    className={`rounded-md py-2 text-sm font-semibold transition ${
      selectedRole === "employee"
        ? "bg-white text-blue-600 shadow"
        : "text-slate-500 hover:text-slate-900"
    }`}
  >
    Employee
  </button>
  <button
    type="button"
    onClick={() => setSelectedRole("admin")}
    className={`rounded-md py-2 text-sm font-semibold transition ${
      selectedRole === "admin"
        ? "bg-white text-blue-600 shadow"
        : "text-slate-500 hover:text-slate-900"
    }`}
  >
    Admin
  </button>


  
</div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" required>Corporate Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@exelon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    className="pl-9"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required>Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    className="pl-9"
                  />
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              New employee at Exelon?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:underline">
                Register account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100/70">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
