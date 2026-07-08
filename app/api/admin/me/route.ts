import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

// Lightweight auth probe for the admin panel gate.
export async function GET() {
  return NextResponse.json({ authed: await isAdmin() });
}
