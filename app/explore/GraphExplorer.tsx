"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface GNode {
  id: string;
  tipe: string;
  label: string;
  jabatan: string;
  tipeAkun: string;
  industri: string;
}
interface GEdge {
  source: string;
  target: string;
  relasi: string;
  bobot: number;
}

interface Pos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const COLORS: Record<string, string> = {
  karyawan: "#f3781f",
  kontak: "#3b82f6",
  akun: "#16a34a",
};

const ALL_REL = [
  "CHAMPION_DARI",
  "ACCOUNT_OWNER",
  "MENANGANI_DEAL",
  "BEKERJA_DI",
  "PERNAH_BEKERJA_DI",
  "REKAN_KERJA",
  "SALING_KENAL",
  "BERINTERAKSI",
];

export default function GraphExplorer() {
  const [raw, setRaw] = useState<{ nodes: GNode[]; edges: GEdge[] } | null>(null);
  const [active, setActive] = useState<Set<string>>(
    // default: sembunyikan dua relasi paling padat agar graph awal lebih terbaca
    new Set(["CHAMPION_DARI", "ACCOUNT_OWNER", "MENANGANI_DEAL", "BEKERJA_DI", "PERNAH_BEKERJA_DI", "REKAN_KERJA"])
  );
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [hover, setHover] = useState<GNode | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 });
  const dragging = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const W = 900;
  const H = 620;

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then(setRaw);
  }, []);

  // edge & node aktif berdasar filter relasi
  const { nodes, edges } = useMemo(() => {
    if (!raw) return { nodes: [] as GNode[], edges: [] as GEdge[] };
    const edges = raw.edges.filter((e) => active.has(e.relasi));
    const used = new Set<string>();
    edges.forEach((e) => {
      used.add(e.source);
      used.add(e.target);
    });
    const nodes = raw.nodes.filter((n) => used.has(n.id));
    return { nodes, edges };
  }, [raw, active]);

  // force-directed layout (iterasi tetap, ringan)
  useEffect(() => {
    if (nodes.length === 0) return;
    const pos: Record<string, Pos> = {};
    const R = Math.min(W, H) / 2 - 40;
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      pos[n.id] = { x: W / 2 + Math.cos(a) * R * 0.8, y: H / 2 + Math.sin(a) * R * 0.8, vx: 0, vy: 0 };
    });

    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const links = edges
      .filter((e) => idx.has(e.source) && idx.has(e.target))
      .map((e) => ({ s: e.source, t: e.target }));

    const iters = 220;
    const k = 90; // jarak ideal
    for (let it = 0; it < iters; it++) {
      const cool = 1 - it / iters;
      // repulsion (O(n^2) tapi n beberapa ratus => ok untuk sekali layout)
      for (let i = 0; i < nodes.length; i++) {
        const a = pos[nodes[i].id];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = pos[nodes[j].id];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 0.01;
          const f = (k * k) / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      // attraction sepanjang edge
      for (const l of links) {
        const a = pos[l.s];
        const b = pos[l.t];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d * d) / k;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
      // pusat gravitasi + update posisi
      for (const n of nodes) {
        const p = pos[n.id];
        p.vx += (W / 2 - p.x) * 0.01;
        p.vy += (H / 2 - p.y) * 0.01;
        p.x += Math.max(-30, Math.min(30, p.vx)) * cool * 0.1;
        p.y += Math.max(-30, Math.min(30, p.vy)) * cool * 0.1;
        p.vx *= 0.85;
        p.vy *= 0.85;
      }
    }
    setPositions(pos);
  }, [nodes, edges]);

  // tetangga node terpilih (untuk highlight)
  const neighbors = useMemo(() => {
    if (!selected) return null;
    const set = new Set<string>([selected]);
    edges.forEach((e) => {
      if (e.source === selected) set.add(e.target);
      if (e.target === selected) set.add(e.source);
    });
    return set;
  }, [selected, edges]);

  function toggleRel(r: string) {
    const next = new Set(active);
    next.has(r) ? next.delete(r) : next.add(r);
    setActive(next);
    setSelected(null);
  }

  // pan & zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setView((v) => ({ ...v, zoom: Math.max(0.3, Math.min(4, v.zoom * factor)) }));
  }
  function onMouseDown(e: React.MouseEvent) {
    dragging.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setView((v) => ({
      ...v,
      tx: dragging.current!.tx + (e.clientX - dragging.current!.x),
      ty: dragging.current!.ty + (e.clientY - dragging.current!.y),
    }));
  }
  function onMouseUp() {
    dragging.current = null;
  }

  if (!raw) return <p style={{ color: "var(--muted)" }}>Memuat graph…</p>;

  return (
    <div>
      {/* filter relasi */}
      <div className="rel-filter">
        {ALL_REL.map((r) => (
          <button
            key={r}
            className={active.has(r) ? "rel-on" : "rel-off"}
            onClick={() => toggleRel(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="graph-meta">
        <span>{nodes.length} node ditampilkan</span> · <span>{edges.length} relasi</span> ·{" "}
        <span className="muted">scroll untuk zoom, seret untuk geser, klik node untuk sorot relasinya</span>
      </div>

      <div
        className="graph-canvas"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.zoom})`}>
            {/* edges */}
            {edges.map((e, i) => {
              const a = positions[e.source];
              const b = positions[e.target];
              if (!a || !b) return null;
              const dim = neighbors && !(neighbors.has(e.source) && neighbors.has(e.target));
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={dim ? "#eadbca" : e.bobot >= 0.8 ? "#f3781f" : "#c99a6a"}
                  strokeWidth={dim ? 0.4 : e.bobot >= 0.8 ? 1.3 : 0.8}
                  strokeOpacity={dim ? 0.4 : 0.8}
                />
              );
            })}
            {/* nodes */}
            {nodes.map((n) => {
              const p = positions[n.id];
              if (!p) return null;
              const dim = neighbors && !neighbors.has(n.id);
              const r = n.tipe === "akun" ? 7 : 5;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x},${p.y})`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelected(selected === n.id ? null : n.id)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={r}
                    fill={COLORS[n.tipe] || "#999"}
                    stroke="#fff"
                    strokeWidth={1.2}
                    opacity={dim ? 0.25 : 1}
                  />
                  {(view.zoom > 1.6 || selected === n.id || (neighbors && neighbors.has(n.id))) && !dim && (
                    <text x={r + 3} y={3} fontSize={7} fill="#2a2320">
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* tooltip */}
        {hover && (
          <div className="graph-tooltip">
            <strong>{hover.label}</strong>
            <div className="muted">
              {hover.tipe === "karyawan"
                ? `${hover.jabatan} · KasirNusa`
                : hover.tipe === "kontak"
                ? hover.jabatan
                : `${hover.tipeAkun} · ${hover.industri}`}
            </div>
          </div>
        )}
      </div>

      {/* legenda */}
      <div className="legend">
        <span><i style={{ background: COLORS.karyawan }} /> Karyawan KasirNusa</span>
        <span><i style={{ background: COLORS.kontak }} /> Kontak</span>
        <span><i style={{ background: COLORS.akun }} /> Akun (pelanggan/prospek)</span>
      </div>
    </div>
  );
}
