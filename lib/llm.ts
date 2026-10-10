import {
  analyzeProspect,
  rankProspects,
  freePath,
  searchNodes,
  listProspects,
  discoverHiddenRelations,
} from "./analyze";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

/**
 * Tools yang bisa dipanggil LLM. Semua mengembalikan angka DARI GRAPH
 * (deterministik), LLM hanya memilih tool & merangkai jawaban.
 */
const TOOLS = [
  {
    type: "function",
    function: {
      name: "rankProspects",
      description:
        "Ranking prospek. Pakai untuk pertanyaan 'top N prospek berdasarkan added value / nilai deal / peluang menang'. 'addedValue' = nilai yang ditambahkan rekomendasi (bukan nilai deal penuh).",
      parameters: {
        type: "object",
        properties: {
          by: { type: "string", enum: ["addedValue", "dealValue", "winProb"], description: "metrik pengurutan" },
          limit: { type: "number", description: "berapa banyak teratas (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyzeProspect",
      description:
        "Analisis lengkap satu prospek: decision maker, jalur terkuat, referensi, rekomendasi, nilai harapan, preseden, alert. Pakai account_id prospek (mis. P01).",
      parameters: {
        type: "object",
        properties: { accountId: { type: "string", description: "account_id prospek, mis. P01" } },
        required: ["accountId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "findPath",
      description: "Cari jalur relasi terkuat & terpendek antara dua node (orang/akun) berdasarkan id. Pakai searchNode dulu bila hanya tahu nama.",
      parameters: {
        type: "object",
        properties: {
          fromId: { type: "string" },
          toId: { type: "string" },
        },
        required: ["fromId", "toId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchNode",
      description: "Cari node (orang/akun) berdasar nama/jabatan untuk mendapatkan id-nya.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listProspects",
      description: "Daftar semua prospek yang ada.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "hiddenRelations",
      description: "Daftar relasi hangat tersembunyi: kontak di prospek yang terhubung ke pelanggan kita.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function runTool(name: string, args: any): any {
  switch (name) {
    case "rankProspects":
      return rankProspects(args.by || "addedValue", args.limit || 5);
    case "analyzeProspect": {
      const a = analyzeProspect(String(args.accountId).toUpperCase());
      // ringkas agar hemat token
      return {
        nama: a.nama,
        industri: a.industri,
        stage: a.stage,
        nilaiTahunan: a.nilaiTahunan,
        decisionMaker: a.decisionMaker,
        jalurTerkuat: a.strongest ? a.strongest.nodes.map((n) => n.label) : null,
        rencanaAksi: a.rencanaAksi,
        nilaiHarapan: a.nilaiHarapan,
        preseden: a.preseden.slice(0, 2),
        alerts: a.alerts,
      };
    }
    case "findPath":
      return freePath(String(args.fromId).toUpperCase(), String(args.toId).toUpperCase());
    case "searchNode":
      return searchNodes(args.query, 8);
    case "listProspects":
      return listProspects();
    case "hiddenRelations":
      return discoverHiddenRelations().slice(0, 10);
    default:
      return { error: `tool ${name} tidak dikenal` };
  }
}

const SYSTEM_PROMPT = `Kamu asisten Sales Intelligence untuk PT KasirNusa, track "Relationship Path Finder".
Jawab pertanyaan tim Sales/Customer Success tentang prospek, decision maker, jalur relasi, dan prioritas deal.

ATURAN ISI:
- SELALU ambil angka dan fakta dari tool. JANGAN mengarang angka.
- "added value" / "nilai yang ditambahkan" = selisih peluang menang dikali nilai deal (dari tool), BUKAN nilai deal penuh.
- Jawab ringkas dalam Bahasa Indonesia. Sebut nama decision maker, jalur, dan nilai bila relevan.
- Kalau pertanyaan soal ranking (mis. "top 5 by added value"), panggil rankProspects.

ATURAN FORMAT (PENTING — ini untuk Slack, BUKAN Markdown biasa):
- DILARANG membuat tabel. Slack tidak bisa menampilkan tabel; akan berantakan.
- Untuk daftar/ranking, pakai list bernomor. Satu item = satu baris ringkas.
- Tebal pakai *satu bintang* (format Slack), BUKAN **dua bintang**.
- Contoh format ranking yang BENAR:
  1. *P01 · Grup Ritel Mandala* — added value *Rp 75.600.000* (peluang 35%→65%) · DM: Rina Hapsari · jalur hangat ✅
  2. *P05 · PT Distribusi Sumber Rejeki* — added value *Rp 16.800.000* (10%→20%) · belum ada jalur hangat
- Setelah daftar, boleh beri 1-2 kalimat kesimpulan singkat.
- Gunakan emoji seperlunya (✅ ⚠️ 💰) untuk keterbacaan.`;

export async function askLLM(question: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY belum di-set di environment.");
  }

  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question },
  ];

  // maksimal 4 putaran tool-call agar tidak loop tak hingga
  for (let round = 0; round < 4; round++) {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${t.slice(0, 200)}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Respons LLM kosong.");

    messages.push(msg);

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // jawaban final
      return msg.content || "(tidak ada jawaban)";
    }

    // jalankan tiap tool call, kembalikan hasilnya ke LLM
    for (const call of toolCalls) {
      let result: any;
      try {
        const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        result = runTool(call.function.name, args);
      } catch (e: any) {
        result = { error: e.message };
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return "Maaf, pertanyaan terlalu kompleks untuk diproses saat ini.";
}
