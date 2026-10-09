"use client";

import type { PathResult, GraphNode } from "@/lib/types";

// warna node sesuai tema orange-putih
const COLORS: Record<string, { fill: string; stroke: string }> = {
  karyawan: { fill: "#fff4ea", stroke: "#f3781f" }, // oranye
  kontak: { fill: "#eef4ff", stroke: "#3b82f6" }, // biru
  akun: { fill: "#eafaf0", stroke: "#16a34a" }, // hijau
};

function colorOf(n: GraphNode) {
  return COLORS[n.tipe] || { fill: "#f3f4f6", stroke: "#9ca3af" };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/**
 * Visualisasi jalur sebagai node-link graph vertikal (SVG murni, tanpa dependency).
 * Node tersusun atas-ke-bawah; tiap sambungan menampilkan nama relasi + bobot.
 */
export default function PathGraph({ path, title }: { path: PathResult | null; title: string }) {
  if (!path || path.nodes.length === 0) {
    return <p style={{ color: "#8a7b6e" }}>Tidak ada jalur untuk divisualisasikan.</p>;
  }

  const n = path.nodes.length;
  const nodeW = 230;
  const nodeH = 56;
  const gapY = 64; // ruang untuk label relasi antar node
  const padX = 24;
  const padY = 18;
  const width = padX * 2 + nodeW;
  const height = padY * 2 + n * nodeH + (n - 1) * gapY;
  const cx = padX + nodeW / 2;

  const yOf = (i: number) => padY + i * (nodeH + gapY);

  return (
    <div
      style={{
        overflowX: "auto",
        background: "#fffaf4",
        border: "1px solid #f0d6bf",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <svg width={width} height={height} role="img" aria-label={`${title}: ${path.nodes.map((x) => x.label).join(" ke ")}`}>
        <defs>
          <marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 5 9 L 10 0" fill="none" stroke="#c99a6a" strokeWidth="1.6" />
          </marker>
        </defs>

        {/* edges (garis vertikal + label relasi) */}
        {path.edges.map((e, i) => {
          const y1 = yOf(i) + nodeH;
          const y2 = yOf(i + 1);
          const midY = (y1 + y2) / 2;
          const strong = e.bobot >= 0.8;
          return (
            <g key={`e${i}`}>
              <line
                x1={cx}
                y1={y1}
                x2={cx}
                y2={y2 - 2}
                stroke={strong ? "#f3781f" : "#c99a6a"}
                strokeWidth={strong ? 2.5 : 1.6}
                strokeDasharray={e.bobot < 0.5 ? "5 4" : undefined}
                markerEnd="url(#arrow-down)"
              />
              <rect
                x={cx + 8}
                y={midY - 17}
                width={nodeW / 2 - 2}
                height={34}
                rx={7}
                fill="#fff"
                stroke="#f0d6bf"
              />
              <text x={cx + 16} y={midY - 3} fontSize="11" fill="#d4620c" fontWeight={700}>
                {truncate(e.relasi, 16)}
              </text>
              <text x={cx + 16} y={midY + 12} fontSize="10" fill="#8a7b6e">
                bobot {e.bobot}
              </text>
            </g>
          );
        })}

        {/* nodes */}
        {path.nodes.map((node, i) => {
          const y = yOf(i);
          const col = colorOf(node);
          return (
            <g key={node.id + i}>
              <rect x={padX} y={y} width={nodeW} height={nodeH} rx={12} fill={col.fill} stroke={col.stroke} strokeWidth={2} />
              <circle cx={padX + 16} cy={y + 20} r={6} fill={col.stroke} />
              <text x={padX + 30} y={y + 24} fontSize="13.5" fill="#2a2320" fontWeight={700}>
                {truncate(node.label, 22)}
              </text>
              <text x={padX + 16} y={y + 42} fontSize="11" fill="#8a7b6e">
                {node.tipe === "karyawan"
                  ? "KasirNusa"
                  : node.props.jabatan
                  ? truncate(node.props.jabatan, 26)
                  : node.props.tipe_akun || node.tipe}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
