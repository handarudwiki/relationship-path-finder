import { NextResponse } from "next/server";
import { getGraph } from "@/lib/graph";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = getGraph();

  // hitung node per tipe
  const nodeByType: Record<string, number> = {};
  for (const n of g.nodes.values()) {
    nodeByType[n.tipe] = (nodeByType[n.tipe] || 0) + 1;
  }

  // hitung edge per relasi (adjacency dicatat dua arah, jadi dibagi 2)
  const edgeByRel: Record<string, number> = {};
  let totalDirected = 0;
  for (const edges of g.adj.values()) {
    for (const e of edges) {
      edgeByRel[e.relasi] = (edgeByRel[e.relasi] || 0) + 1;
      totalDirected++;
    }
  }
  const edgeByRelUndirected: Record<string, number> = {};
  for (const k of Object.keys(edgeByRel)) edgeByRelUndirected[k] = edgeByRel[k] / 2;

  return NextResponse.json({
    totalNode: g.nodes.size,
    nodeByType,
    totalEdgeUnik: totalDirected / 2,
    edgeByRelasi: edgeByRelUndirected,
  });
}
