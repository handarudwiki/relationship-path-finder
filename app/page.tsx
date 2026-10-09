"use client";

import { useEffect, useState } from "react";
import type { ProspectAnalysis, PathResult, GraphNode } from "@/lib/types";
import PathGraph from "./PathGraph";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

function PathView({ path, label }: { path: PathResult | null; label: string }) {
  if (!path) return <p className="score">Tidak ada jalur ditemukan.</p>;
  return (
    <div>
      <p className="score">
        {label} · {path.panjang} hop · skor kekuatan {path.skor}
      </p>
      <div className="path">
        {path.nodes.map((n: GraphNode, i: number) => (
          <div key={n.id + i}>
            <div className="hop">
              <span className={`node-pill ${n.tipe}`}>{n.label}</span>
              <span className="score">
                {n.tipe === "karyawan" ? "KasirNusa" : n.tipe}
                {n.props.jabatan ? ` · ${n.props.jabatan}` : ""}
              </span>
            </div>
            {i < path.edges.length && (
              <div className="rel">
                <span className="relname">↳ {path.edges[i].relasi} (bobot {path.edges[i].bobot})</span>
                <span className="bukti">{path.edges[i].bukti}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface NodeHit {
  id: string;
  tipe: string;
  label: string;
  info: string;
}

export default function Home() {
  const [prospects, setProspects] = useState<{ id: string; nama: string; industri: string }[]>([]);
  const [selected, setSelected] = useState<string>("P01");
  const [data, setData] = useState<ProspectAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // free-form query
  const [qFrom, setQFrom] = useState("");
  const [qTo, setQTo] = useState("");
  const [fromHits, setFromHits] = useState<NodeHit[]>([]);
  const [toHits, setToHits] = useState<NodeHit[]>([]);
  const [fromSel, setFromSel] = useState<NodeHit | null>(null);
  const [toSel, setToSel] = useState<NodeHit | null>(null);
  const [freeResult, setFreeResult] = useState<any>(null);

  // insights
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    fetch("/api/prospects").then((r) => r.json()).then((d) => setProspects(d.prospects || []));
    fetch("/api/insights").then((r) => r.json()).then(setInsights);
    analyze("P01");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function analyze(id: string) {
    setLoading(true);
    setData(null);
    const r = await fetch(`/api/analyze?account=${id}`);
    const d = await r.json();
    setData(d);
    setLoading(false);
  }

  function copyMsg() {
    if (data?.draftPesan) {
      navigator.clipboard.writeText(data.draftPesan);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function doSearch(q: string, which: "from" | "to") {
    if (q.length < 2) {
      which === "from" ? setFromHits([]) : setToHits([]);
      return;
    }
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    which === "from" ? setFromHits(d.hits || []) : setToHits(d.hits || []);
  }

  async function runFreePath() {
    if (!fromSel || !toSel) return;
    const r = await fetch(`/api/path?from=${fromSel.id}&to=${toSel.id}`);
    setFreeResult(await r.json());
  }

  return (
    <div className="container">
      <header className="top">
        <h1>🔗 Relationship Path Finder</h1>
        <span className="chip">PT KasirNusa · Sales Track</span>
        <a href="/explore" className="nav-link">🕸️ Explore Graph →</a>
      </header>
      <p className="subtitle">
        Lewat siapa jalur terbaik menuju decision maker? Context graph lintas 5 sumber data, dengan jalur bukti.
      </p>

      <div className="controls">
        <label htmlFor="prospek">Pilih prospek:</label>
        <select id="prospek" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {prospects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} · {p.nama} ({p.industri})
            </option>
          ))}
        </select>
        <button className="primary" onClick={() => analyze(selected)} disabled={loading}>
          {loading ? "Menganalisis…" : "Cari Jalur"}
        </button>
      </div>

      {loading && <div className="loading">Membangun graph & mencari jalur…</div>}

      {data && (
        <div className="grid">
          <div className="card">
            <h2>Prospek</h2>
            <div className="dm-name">{data.nama}</div>
            <div className="stat" style={{ marginTop: 8 }}>
              <span className="chip">{data.industri}</span>
              <span className="chip">{data.outlet} outlet</span>
              <span className="chip">Stage: {data.stage}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="score">Nilai deal per tahun</div>
              <div className="money">{rupiah(data.nilaiTahunan)}</div>
            </div>
          </div>

          <div className="card">
            <h2>Decision Maker Terdeteksi</h2>
            {data.decisionMaker ? (
              <>
                <div className="dm-name">{data.decisionMaker.nama}</div>
                <div className="dm-role">{data.decisionMaker.jabatan}</div>
                <p className="score" style={{ marginTop: 6 }}>{data.decisionMaker.alasan}</p>
                <ul className="evidence">
                  {data.decisionMaker.bukti.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Belum teridentifikasi — tidak ada kontak terdaftar.</p>
            )}
          </div>

          <div className="card">
            <h2>Jalur Terkuat (paling bisa diandalkan)</h2>
            <PathGraph path={data.strongest} title="Jalur terkuat" />
            <div style={{ marginTop: 12 }}>
              <PathView path={data.strongest} label="Jalur terkuat" />
            </div>
          </div>

          <div className="card">
            <h2>Jalur Terpendek (paling sedikit perantara)</h2>
            <PathGraph path={data.shortest} title="Jalur terpendek" />
            <div style={{ marginTop: 12 }}>
              <PathView path={data.shortest} label="Jalur terpendek" />
            </div>
          </div>

          <div className="card full">
            <h2>Strategi Pendekatan</h2>
            {data.catatan.map((c, i) => (
              <div key={i} className="key-finding">💡 {c}</div>
            ))}
            {data.referensiPelanggan && (
              <div style={{ marginTop: 12 }}>
                <strong>Referensi pelanggan yang disarankan:</strong> {data.referensiPelanggan.nama}
                <p className="score">{data.referensiPelanggan.alasan}</p>
              </div>
            )}
          </div>

          <div className="card full">
            <h2>Draft Pesan Intro</h2>
            <textarea value={data.draftPesan} readOnly />
            <button className="primary copy-btn" onClick={copyMsg}>
              {copied ? "Tersalin ✓" : "Salin pesan"}
            </button>
          </div>
        </div>
      )}

      {/* ================= QUERY BEBAS (tahan pertanyaan dadakan juri) ============== */}
      <h2 className="section-title">🔎 Query Bebas — jalur antar siapa pun</h2>
      <div className="card">
        <p className="score" style={{ marginBottom: 12 }}>
          Ketik nama / jabatan / akun apa pun. Cocok untuk pertanyaan dadakan: &quot;lewat siapa jalur ke CFO Saiyo?&quot;
        </p>
        <div className="grid">
          <div>
            <label className="score">Dari (mis. nama karyawan / kontak):</label>
            <input
              className="text-input"
              value={qFrom}
              placeholder="cari node asal…"
              onChange={(e) => {
                setQFrom(e.target.value);
                setFromSel(null);
                doSearch(e.target.value, "from");
              }}
            />
            {!fromSel &&
              fromHits.map((h) => (
                <div key={h.id} className="hit" onClick={() => { setFromSel(h); setFromHits([]); setQFrom(h.label); }}>
                  <strong>{h.label}</strong> <span className="score">· {h.info}</span>
                </div>
              ))}
            {fromSel && <div className="selected-node">✓ {fromSel.label} <span className="score">({fromSel.info})</span></div>}
          </div>
          <div>
            <label className="score">Ke (mis. decision maker tujuan):</label>
            <input
              className="text-input"
              value={qTo}
              placeholder="cari node tujuan…"
              onChange={(e) => {
                setQTo(e.target.value);
                setToSel(null);
                doSearch(e.target.value, "to");
              }}
            />
            {!toSel &&
              toHits.map((h) => (
                <div key={h.id} className="hit" onClick={() => { setToSel(h); setToHits([]); setQTo(h.label); }}>
                  <strong>{h.label}</strong> <span className="score">· {h.info}</span>
                </div>
              ))}
            {toSel && <div className="selected-node">✓ {toSel.label} <span className="score">({toSel.info})</span></div>}
          </div>
        </div>
        <button className="primary" style={{ marginTop: 14 }} onClick={runFreePath} disabled={!fromSel || !toSel}>
          Cari Jalur
        </button>

        {freeResult && freeResult.adaJalur && (
          <div className="grid" style={{ marginTop: 16 }}>
            <div>
              <h3 style={{ color: "var(--accent)", marginBottom: 8 }}>Jalur Terkuat (paling bisa diandalkan)</h3>
              <PathGraph path={freeResult.strongest} title="Jalur terkuat" />
              <div style={{ marginTop: 12 }}>
                <PathView path={freeResult.strongest} label="Terkuat" />
              </div>
            </div>
            <div>
              <h3 style={{ color: "var(--accent)", marginBottom: 8 }}>Jalur Terpendek (paling sedikit perantara)</h3>
              <PathGraph path={freeResult.shortest} title="Jalur terpendek" />
              <div style={{ marginTop: 12 }}>
                <PathView path={freeResult.shortest} label="Terpendek" />
              </div>
            </div>
          </div>
        )}
        {freeResult && !freeResult.adaJalur && (
          <p style={{ marginTop: 14 }} className="badge-red">Tidak ada jalur yang menghubungkan keduanya di graph.</p>
        )}
        {freeResult && freeResult.error && <p className="badge-red" style={{ marginTop: 14 }}>{freeResult.error}</p>}
      </div>

      {/* ================= TEMUAN LINTAS DATASET ============== */}
      {insights && insights.hiddenRelations && (
        <>
          <h2 className="section-title">🕵️ Relasi Tersembunyi di Seluruh Dataset</h2>
          <div className="card">
            <p className="score" style={{ marginBottom: 10 }}>
              Kontak di prospek yang punya jalur hangat ke pelanggan kami — ditemukan otomatis lintas 5 sumber.
            </p>
            <table className="data-table">
              <thead>
                <tr><th>Kontak (prospek)</th><th>Jabatan</th><th>Relasi hangat ke pelanggan</th><th>Nilai</th></tr>
              </thead>
              <tbody>
                {insights.hiddenRelations.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>{r.kontak} <span className="score">· {r.prospek}</span></td>
                    <td>{r.jabatan}</td>
                    <td><span className="relname">{r.relasi}</span> → {r.pelanggan}</td>
                    <td className="money-sm">{r.nilaiProspek ? rupiah(r.nilaiProspek) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ================= BONUS LINTAS-TRACK ============== */}
      {insights && insights.crossTrack && insights.crossTrack.length > 0 && (
        <>
          <h2 className="section-title">⭐ Bonus Lintas-Track: Risiko Retensi + Peluang Sales</h2>
          <div className="card">
            {insights.crossTrack.map((c: any, i: number) => (
              <div key={i} className="key-finding">
                🔁 {c.catatan}
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="app-footer">
        Relationship Path Finder · PT KasirNusa · Context graph lintas 5 sumber · jawaban berbukti
      </footer>
    </div>
  );
}
