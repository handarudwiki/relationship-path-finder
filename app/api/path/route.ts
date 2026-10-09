import { NextRequest, NextResponse } from "next/server";
import { freePath } from "@/lib/analyze";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "parameter 'from' dan 'to' wajib diisi" }, { status: 400 });
  }
  try {
    return NextResponse.json(freePath(from.toUpperCase(), to.toUpperCase()));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
