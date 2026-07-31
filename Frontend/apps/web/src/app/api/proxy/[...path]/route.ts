import { NextRequest, NextResponse } from "next/server";
import proxy from "@/lib/proxy";

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const targetPath = "/" + (path ? path.join("/") : "");
    const searchParams = req.nextUrl.search;
    const targetUrl = `${BACKEND_URL}${targetPath}${searchParams}`;

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (key !== "host" && key !== "content-length") {
        headers[key] = value;
      }
    });

    let body: any = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = await req.json();
      } catch {
        body = await req.text();
      }
    }

    const response = (await proxy.request(targetUrl, {
      method: req.method,
      headers,
      body,
      raw: true,
    })) as unknown as Response;

    const resBody = await response.arrayBuffer();
    const resHeaders = new Headers();
    response.headers.forEach((value: string, key: string) => {
      resHeaders.set(key, value);
    });

    return new NextResponse(resBody, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("[NEXT API PROXY ERROR]", err);
    return NextResponse.json(
      {
        error: "Proxy forwarding error",
        message: err.message || "Failed to forward request to server",
      },
      { status: err.status || 500 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
