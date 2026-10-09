import { NextRequest, NextResponse } from "next/server";
import { searchNodes } from "@/lib/analyze";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  try {
    return NextResponse.json({ hits: searchNodes(q) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
