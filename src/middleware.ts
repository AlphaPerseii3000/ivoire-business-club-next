import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const publicRoutes = ["/", "/pricing", "/auth/signin", "/auth/signup", "/auth/error"];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route)) || pathname.startsWith("/api/auth");

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
    if ((session.user as any).role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (!isPublic && !pathname.startsWith("/api")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
  }

  if (session && (pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
