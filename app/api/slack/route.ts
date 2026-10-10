import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { slackResponseFor } from "@/lib/analyze";
import { askLLM } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * Slash command Slack: /pathfinder <pertanyaan atau prospek>
 *
 * Mode:
 *  - Jika teks berupa id prospek singkat (mis. "P01") -> balas kartu analisis langsung.
 *  - Jika teks berupa pertanyaan natural ("top 5 prospek by added value") -> LLM.
 *
 * Karena Slack minta balasan < 3 detik, untuk mode LLM kita balas cepat
 * ("sedang berpikir...") lalu kirim hasil via response_url di background.
 */

function verifySlackSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true; // mode demo lokal
  const ts = req.headers.get("x-slack-request-timestamp");
  const sig = req.headers.get("x-slack-signature");
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const base = `v0:${ts}:${rawBody}`;
  const hmac = "v0=" + crypto.createHmac("sha256", secret).update(base).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sig));
  } catch {
    return false;
  }
}

// deteksi: apakah teks ini sekadar id prospek (P01) atau pertanyaan natural?
function looksLikeProspectId(text: string): boolean {
  return /^[pP]\d{1,2}$/.test(text.trim());
}

/**
 * Ubah Markdown umum -> Slack mrkdwn, dan buang sisa tabel markdown
 * supaya tampilan di Slack rapi (Slack tidak merender tabel/`**bold**`).
 */
function toSlackMrkdwn(s: string): string {
  let out = s;
  // **bold** -> *bold*
  out = out.replace(/\*\*(.+?)\*\*/g, "*$1*");
  // ### Heading -> *Heading*
  out = out.replace(/^#{1,6}\s*(.+)$/gm, "*$1*");
  // baris pemisah tabel markdown ( |---|---| ) -> hapus
  out = out.replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, "");
  // baris tabel " | a | b | " -> "a · b"
  out = out
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (t.startsWith("|") && t.endsWith("|")) {
        return t
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean)
          .join(" · ");
      }
      return line;
    })
    .join("\n");
  // rapikan baris kosong berlebih
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

async function postToResponseUrl(responseUrl: string, text: string) {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_type: "in_channel", text: toSlackMrkdwn(text) }),
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const text = (params.get("text") || "").trim();
  const responseUrl = params.get("response_url") || "";

  if (!text) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Coba: `/pathfinder P01` atau `/pathfinder top 5 prospek berdasarkan added value`",
    });
  }

  // Mode 1: id prospek -> kartu analisis langsung (cepat, tanpa LLM)
  if (looksLikeProspectId(text)) {
    return NextResponse.json(slackResponseFor(text));
  }

  // Mode 2: pertanyaan natural -> LLM via background, balas cepat dulu
  if (responseUrl) {
    // proses LLM tanpa menunggu (fire-and-forget), kirim via response_url
    askLLM(text)
      .then((answer) => postToResponseUrl(responseUrl, answer))
      .catch((e) => postToResponseUrl(responseUrl, `Maaf, gagal memproses: ${e.message}`));

    return NextResponse.json({
      response_type: "ephemeral",
      text: `🤔 Menganalisis: _${text}_ …`,
    });
  }

  // fallback (tanpa response_url, mis. tes manual): tunggu LLM langsung
  try {
    const answer = await askLLM(text);
    return NextResponse.json({ response_type: "in_channel", text: toSlackMrkdwn(answer) });
  } catch (e: any) {
    return NextResponse.json({ response_type: "ephemeral", text: `Error: ${e.message}` });
  }
}

// Tes manual di browser:
//   /api/slack?q=P01                     -> kartu analisis
//   /api/slack?ask=top 5 ... added value -> jawaban LLM
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const ask = req.nextUrl.searchParams.get("ask");
  if (ask) {
    try {
      const answer = await askLLM(ask);
      return NextResponse.json({ answer: toSlackMrkdwn(answer) });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json(slackResponseFor(q || "P01"));
}
