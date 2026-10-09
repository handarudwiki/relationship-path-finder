"use client";

import type { PathResult, GraphNode } from "@/lib/types";

const COLORS: Record<string, string> = {
  karyawan: "#ffcf56",
  kontak: "#6ea8fe",
  akun: "#3ddc97",
};

function nodeColor(n: GraphNode): string {
  return COLORS[n.tipe] || "#9aa6c7";
}

/**
 * Visualisasi jalur sebagai node-link graph (SVG murni, tanpa dependency).
 * Node tersusun horizontal; label relasi + bobot muncul di tiap edge.
 */
export default function PathGraph({ path, title }: { path: PathResult | null; title: string }) {
  if (!path || path.nodes.length === 0) {
    return <p style={{ color: "#9aa6c7" }}>Tidak ada jalur untuk divisualisasikan.</p>;
  }

  const n = path.nodes.length;
  const nodeW = 150;
  const nodeH = 54;
  const gapX = 70;
  const padX = 20;
  const padY = 60;
  const width = padX * 2 + n * nodeW + (n - 1) * gapX;
  const height = 170;
  const y = padY;

  const xOf = (i: number) => padX + i * (nodeW + gapX);

  return (
    <div style={{ overflowX: "auto", background: "#0e1527", border: "1px solid #2a3356", borderRadius: 12, padding: 10 }}>
      <svg width={width} height={height} role="img" aria-label={`${title}: ${path.nodes.map((x) => x.label).join(" ke ")}`}>
        {/* edges */}
        {path.edges.map((e, i) => {
          const x1 = xOf(i) + nodeW;
          const x2 = xOf(i + 1);
          const midX = (x1 + x2) / 2;
          const cy = y + nodeH / 2;
          const strong = e.bobot >= 0.8;
          return (
            <g key={`e${i}`}>
              <line
                x1={x1}
                y1={cy}
                x2={x2}
                y2={cy}
                stroke={strong ? "#3ddc97" : "#64719c"}
                strokeWidth={strong ? 3 : 2}
                strokeDasharray={e.bobot < 0.5 ? "5 4" : undefined}
                markerEnd="url(#arrow)"
              />
              <text x={midX} y={cy - 12} textAnchor="middle" fontSize="11" fill="#6ea8fe" fontWeight={600}>
                {e.relasi}
              </text>
              <text x={midX} y={cy + 20} textAnchor="middle" fontSize="10" fill="#9aa6c7">
                bobot {e.bobot}
              </text>
            </g>
          );
        })}

        {/* arrow marker */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64719c" />
          </marker>
        </defs>

        {/* nodes */}
        {path.nodes.map((node, i) => {
          const x = xOf(i);
          const col = nodeColor(node);
          return (
            <g key={node.id + i}>
              <rect x={x} y={y} width={nodeW} height={nodeH} rx={10} fill="#18213c" stroke={col} strokeWidth={2} />
              <circle cx={x + 14} cy={y + 16} r={5} fill={col} />
              <text x={x + 26} y={y + 20} fontSize="12.5" fill="#eef2fb" fontWeight={700}>
                {truncate(node.label, 16)}
              </text>
              <text x={x + 12} y={y + 38} fontSize="10.5" fill="#9aa6c7">
                {node.tipe === "karyawan"
                  ? "KasirNusa"
                  : node.props.jabatan
                  ? truncate(node.props.jabatan, 20)
                  : node.props.tipe_akun || node.tipe}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
