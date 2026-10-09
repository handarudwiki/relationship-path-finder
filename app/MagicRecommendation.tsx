"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HasilRekomendasi } from "@/lib/recommend";

interface Props {
  accountId: string;
  catatan: string[];
  referensi: { nama: string; alasan: string } | null;
}

export function Bukti({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return (
    <div className="bukti-list">
      {ids.map((id) => (
        <span key={id} className="bukti-chip">
          {id}
        </span>
      ))}
    </div>
  );
}

/** Saran pendekatan dari AI (dibuat sekali lalu terkunci); bila gagal, kembali ke temuan otomatis berbasis aturan. */
export default function MagicRecommendation({ accountId, catatan, referensi }: Props) {
  const [hasil, setHasil] = useState<HasilRekomendasi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const permintaan = useRef(0);

  const muat = useCallback(async () => {
    const id = ++permintaan.current;
    setLoading(true);
    setError(null);
    setHasil(null);
    try {
      const r = await fetch(`/api/recommend?account=${encodeURIComponent(accountId)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      if (id === permintaan.current) setHasil(d);
    } catch (e) {
      if (id === permintaan.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === permintaan.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    muat();
  }, [muat]);

  const r = hasil?.rekomendasi;
  return (
    <div>
      <p className="score magic-head">Saran AI yang disusun dari data CRM, lengkap dengan ID bukti.</p>

      {loading && <div className="magic-loading">✨ Menyusun rekomendasi dari data CRM… biasanya 10–30 detik.</div>}

      {error && (
        <>
          <p className="badge-red magic-error">Magic Recommendation gagal dimuat: {error}</p>
          <p className="score">Menampilkan temuan otomatis tanpa AI:</p>
          {catatan.map((c, i) => (
            <div key={i} className="key-finding">
              💡 {c}
            </div>
          ))}
          {referensi && (
            <div style={{ marginTop: 12 }}>
              <strong>Referensi pelanggan yang disarankan:</strong> {referensi.nama}
              <p className="score">{referensi.alasan}</p>
            </div>
          )}
        </>
      )}

      {hasil && r && (
        <div>
          <p className="magic-ringkasan">{r.ringkasan}</p>

          <section className="magic-section">
            <h3>Pendekatan</h3>
            <dl className="magic-meta">
              <dt>Dipimpin</dt>
              <dd>{r.pendekatan.pemimpin}</dd>
              <dt>Lewat</dt>
              <dd>{r.pendekatan.perantara}</dd>
            </dl>
            <p className="magic-text">{r.pendekatan.alasan}</p>
          </section>

          <section className="magic-section">
            <h3>Langkah minggu ini</h3>
            <ol className="magic-list">
              {r.langkah.map((l, i) => (
                <li key={i}>
                  <strong>{l.judul}</strong>
                  <p className="magic-text">{l.detail}</p>
                  <Bukti ids={l.bukti} />
                </li>
              ))}
            </ol>
          </section>

          {r.referensi.akun && (
            <section className="magic-section">
              <h3>Referensi pelanggan</h3>
              <strong>{r.referensi.akun}</strong>
              <p className="magic-text">{r.referensi.alasan}</p>
              <Bukti ids={r.referensi.bukti} />
            </section>
          )}

          {r.risiko.length > 0 && (
            <section className="magic-section">
              <h3>Risiko & mitigasi</h3>
              <ul className="magic-list">
                {r.risiko.map((x, i) => (
                  <li key={i}>
                    <strong>{x.risiko}</strong>
                    <p className="magic-text">Mitigasi: {x.mitigasi}</p>
                    <Bukti ids={x.bukti} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="score magic-foot">
            🔒 Disusun {hasil.model} via OpenRouter pada{" "}
            {new Date(hasil.dibuat).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}, lalu
            dikunci. ID bukti yang tidak ada di data dibuang otomatis.
          </p>
        </div>
      )}
    </div>
  );
}
