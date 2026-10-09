import { NextResponse } from "next/server";
import { discoverHiddenRelations, crossTrackSignals } from "@/lib/analyze";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      hiddenRelations: discoverHiddenRelations(),
      crossTrack: crossTrackSignals(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
