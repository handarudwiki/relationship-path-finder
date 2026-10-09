import { NextRequest, NextResponse } from "next/server";
import { draftPesan, RekomendasiError } from "@/lib/recommend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET ?account=P01 -> draft pesan intro dari AI, mengikuti Magic Recommendation; dibuat sekali lalu terkunci. */
export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get("account") || "";
  try {
    return NextResponse.json(await draftPesan(account));
  } catch (e) {
    if (e instanceof RekomendasiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("Draft pesan gagal:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Terjadi kesalahan saat menyusun draft pesan." }, { status: 500 });
  }
}
