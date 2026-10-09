import { NextRequest, NextResponse } from "next/server";
import { getGraph } from "@/lib/graph";

export const dynamic = "force-dynamic";

/**
 * Ekspor seluruh graph untuk visualisasi.
 * Query opsional:
 *   ?rel=CHAMPION_DARI,BEKERJA_DI  -> hanya relasi tertentu
 *   ?account=P01                   -> hanya node yang terkait akun ini (ego graph)
 */
export async function GET(req: NextRequest) {
  const g = getGraph();
  const relParam = req.nextUrl.searchParams.get("rel");
  const relFilter = relParam ? new Set(relParam.split(",")) : null;

  // kumpulkan edge unik (adjacency dua arah -> ambil sekali)
  const seen = new Set<string>();
  const edges: { source: string; target: string; relasi: string; bobot: number }[] = [];
  for (const [from, list] of g.adj.entries()) {
    for (const e of list) {
      if (relFilter && !relFilter.has(e.relasi)) continue;
      const key = [from, e.to].sort().join("|") + "|" + e.relasi;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: from, target: e.to, relasi: e.relasi, bobot: e.bobot });
    }
  }

  // hanya sertakan node yang punya edge (supaya tidak ada titik mengambang)
  const used = new Set<string>();
  for (const e of edges) {
    used.add(e.source);
    used.add(e.target);
  }

  const nodes = Array.from(g.nodes.values())
    .filter((n) => used.has(n.id) || !relFilter)
    .map((n) => ({
      id: n.id,
      tipe: n.tipe,
      label: n.label,
      jabatan: n.props.jabatan || "",
      tipeAkun: n.props.tipe_akun || "",
      industri: n.props.industri || "",
    }));

  return NextResponse.json({
    nodes,
    edges,
    relasiTersedia: ["BEKERJA_DI", "PERNAH_BEKERJA_DI", "CHAMPION_DARI", "SALING_KENAL", "BERINTERAKSI", "ACCOUNT_OWNER", "MENANGANI_DEAL", "REKAN_KERJA"],
  });
}
