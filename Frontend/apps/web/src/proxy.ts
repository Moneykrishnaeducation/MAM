import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Next.js 16 Request Proxy (replaces legacy middleware.js)
 * Intercepts requests and handles API forwarding to backend server.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Forward media requests so uploaded documents load from the backend server.
  if (url.pathname.startsWith("/media/")) {
    const destination = `${BACKEND_URL}${url.pathname}${url.search}`;
    return NextResponse.rewrite(new URL(destination));
  }

  // Forward /api/proxy/* calls to backend server
  if (url.pathname.startsWith("/api/proxy/")) {
    const backendPath = url.pathname.replace(/^\/api\/proxy/, "");
    const destination = `${BACKEND_URL}${backendPath}${url.search}`;
    return NextResponse.rewrite(new URL(destination));
  }

  return NextResponse.next();
}

/**
 * Proxy Matcher configuration according to Next.js 16 docs
 */
export const config = {
  matcher: [
    /*
     * Match request paths excluding:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

export default proxy;
