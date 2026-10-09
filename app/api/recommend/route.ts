import { NextRequest, NextResponse } from "next/server";
import { magicRecommendation, RekomendasiError } from "@/lib/recommend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET ?account=P01 -> Magic Recommendation dari AI; dibuat sekali lalu terkunci. */
export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get("account") || "";
  try {
    return NextResponse.json(await magicRecommendation(account));
  } catch (e) {
    if (e instanceof RekomendasiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("Magic Recommendation gagal:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Terjadi kesalahan saat menyusun rekomendasi." }, { status: 500 });
  }
}
