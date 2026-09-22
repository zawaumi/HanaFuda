import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isAuthEnabled, isSupabaseConfigured } from "@/lib/supabase/config";

const publicPaths = ["/login", "/signup", "/auth"];

function isPublic(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAuthEnabled) return NextResponse.next();

  // Without project credentials there is no way to establish a session, so every
  // protected route is sent to the login page rather than served signed out.
  if (!isSupabaseConfigured) {
    if (isPublic(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries) => {
        for (const { name, value } of entries) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of entries) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (!data.user && !isPublic(pathname)) {
    const target = new URL("/login", request.url);
    target.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(target);
  }

  if (data.user && isPublic(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
