import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ path: ["status"] }];
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
