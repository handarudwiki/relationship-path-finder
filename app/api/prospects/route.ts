import { NextResponse } from "next/server";
import { listProspects } from "@/lib/analyze";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ prospects: listProspects() });
}
