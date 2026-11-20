import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed on protected routes when authentication cannot be configured.
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("placeholder") ||
    supabaseAnonKey.includes("placeholder")
  ) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/employee")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "authentication_unavailable");
      return NextResponse.redirect(url);
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "authentication_unavailable");
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/employee")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "authentication_unavailable");
      return NextResponse.redirect(url);
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "authentication_unavailable");
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Resolve a role only from a successfully loaded profile.
  let userRole: "employee" | "admin" | null = null;
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profileError && (profile?.role === "employee" || profile?.role === "admin")) {
      userRole = profile.role;
    }
  }

  // Route: /admin/*
  if (pathname.startsWith("/admin")) {
    if (!user || userRole === null) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", user ? "profile_unavailable" : "authentication_required");
      if (!user) url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
    if (userRole !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/employee/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Route: /employee/*
  if (pathname.startsWith("/employee")) {
    if (!user || userRole === null) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", user ? "profile_unavailable" : "authentication_required");
      if (!user) url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Route: /login or /register
  if (pathname === "/login" || pathname === "/register") {
    if (user && userRole !== null) {
      const target = userRole === "admin" ? "/admin/dashboard" : "/employee/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // Root route /
  if (pathname === "/") {
    if (user && userRole !== null) {
      const target = userRole === "admin" ? "/admin/dashboard" : "/employee/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
