import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public paths that don't require auth
  const publicPaths = ["/login", "/signup", "/auth/callback", "/auth/confirm"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // If not authenticated and not on a public path, redirect to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Paths that authenticated users can access regardless of role/onboarding
  const specialPaths = ["/awaiting-approval", "/onboarding"];
  const isSpecialPath = specialPaths.some((p) => pathname.startsWith(p));

  // If authenticated, check role and onboarding status
  if (user && !isPublicPath && !isSpecialPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, role")
      .eq("id", user.id)
      .single();

    if (profile) {
      // No role assigned — redirect to awaiting approval
      if (!profile.role) {
        const url = request.nextUrl.clone();
        url.pathname = "/awaiting-approval";
        return NextResponse.redirect(url);
      }

      // Role assigned but onboarding not complete — redirect to onboarding
      if (!profile.onboarding_complete) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  }

  // If user has a role and is on /awaiting-approval, redirect to onboarding or dashboard
  if (user && pathname === "/awaiting-approval") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_complete")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const url = request.nextUrl.clone();
      url.pathname = profile.onboarding_complete ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // If authenticated and on login/signup, redirect to dashboard
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
