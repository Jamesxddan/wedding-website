import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country");
  if (country === "OM") {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Unavailable</title><style>
        body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0f1a;font-family:serif;color:#fff;text-align:center;}
        h1{font-size:2rem;margin-bottom:1rem;}p{color:#aaa;font-size:1rem;}
      </style></head><body><div><h1>Not Available</h1><p>This page is not available in your region.</p></div></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
