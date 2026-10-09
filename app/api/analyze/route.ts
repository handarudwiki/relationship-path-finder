import { NextRequest, NextResponse } from "next/server";
import { analyzeProspect } from "@/lib/analyze";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("account");
  if (!id) {
    return NextResponse.json({ error: "parameter 'account' wajib diisi" }, { status: 400 });
  }
  try {
    const result = analyzeProspect(id.toUpperCase());
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
