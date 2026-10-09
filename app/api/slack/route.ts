import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { slackResponseFor } from "@/lib/analyze";

export const dynamic = "force-dynamic";

/**
 * Slash command Slack: /pathfinder <prospek atau nama>
 *
 * Setup di Slack:
 *   1. Buat Slack App -> Slash Commands -> Create "/pathfinder"
 *   2. Request URL: https://<domain-kamu>/api/slack
 *   3. Salin "Signing Secret" ke env SLACK_SIGNING_SECRET (opsional tapi disarankan)
 *
 * Slack mengirim application/x-www-form-urlencoded dengan field `text`.
 */

function verifySlackSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true; // kalau belum di-set, lewati verifikasi (mode demo)

  const ts = req.headers.get("x-slack-request-timestamp");
  const sig = req.headers.get("x-slack-signature");
  if (!ts || !sig) return false;

  // tolak request lebih dari 5 menit (anti-replay)
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const base = `v0:${ts}:${rawBody}`;
  const hmac = "v0=" + crypto.createHmac("sha256", secret).update(base).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sig));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const text = params.get("text") || "";

  if (!text.trim()) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Pakai: `/pathfinder P01` atau `/pathfinder Mandala` untuk melihat jalur ke decision maker.",
    });
  }

  try {
    const resp = slackResponseFor(text);
    return NextResponse.json(resp);
  } catch (e: any) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Terjadi kesalahan: ${e.message}`,
    });
  }
}

// Berguna untuk tes manual di browser: /api/slack?q=P01
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "P01";
  return NextResponse.json(slackResponseFor(q));
}
