"use client";

import { useEffect, useRef, useState } from "react";
import type { HasilPesan } from "@/lib/recommend";
import { Bukti } from "./MagicRecommendation";

/** Draft pesan intro dari AI (dibuat sekali lalu terkunci); bila gagal, pakai template berbasis aturan. */
export default function DraftPesanAI({ accountId, cadangan }: { accountId: string; cadangan: string }) {
  const [hasil, setHasil] = useState<HasilPesan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const permintaan = useRef(0);

  useEffect(() => {
    const id = ++permintaan.current;
    setLoading(true);
    setError(null);
    setHasil(null);
    fetch(`/api/draft?account=${encodeURIComponent(accountId)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        return d as HasilPesan;
      })
      .then((d) => {
        if (id === permintaan.current) setHasil(d);
      })
      .catch((e) => {
        if (id === permintaan.current) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (id === permintaan.current) setLoading(false);
      });
  }, [accountId]);

  const p = hasil?.pesan;
  const teks = p ? (p.subjek && p.subjek !== "-" ? `Subjek: ${p.subjek}\n\n${p.isi}` : p.isi) : error ? cadangan : "";

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1500);
    } catch {
      // Browser menolak akses clipboard; teks tetap bisa disalin manual dari kotak di atas.
    }
  }

  return (
    <div>
      <p className="score magic-head">Pesan pembuka dari AI yang mengikuti Magic Recommendation di atas.</p>

      {loading && <div className="magic-loading">✨ Menyusun draft pesan dari rekomendasi… biasanya 10–40 detik.</div>}

      {error && <p className="badge-red magic-error">Draft pesan AI gagal dimuat: {error} Menampilkan template tanpa AI.</p>}

      {p && (
        <dl className="magic-meta">
          <dt>Dari</dt>
          <dd>{p.dari}</dd>
          <dt>Kepada</dt>
          <dd>{p.kepada}</dd>
          <dt>Saluran</dt>
          <dd>{p.saluran}</dd>
        </dl>
      )}

      {teks && (
        <>
          <textarea className="magic-pesan" value={teks} readOnly />
          <button className="primary copy-btn" onClick={salin}>
            {tersalin ? "Tersalin ✓" : "Salin pesan"}
          </button>
        </>
      )}

      {hasil && p && (
        <>
          {p.bukti.length > 0 && <p className="score magic-foot">Dasar pesan (catatan internal, tidak ikut terkirim):</p>}
          <Bukti ids={p.bukti} />
          <p className="score magic-foot">
            🔒 Disusun {hasil.model} via OpenRouter pada{" "}
            {new Date(hasil.dibuat).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}, lalu
            dikunci.
          </p>
        </>
      )}
    </div>
  );
}
