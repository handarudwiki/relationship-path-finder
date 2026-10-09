import { loadData, RawData } from "./data";
import { GraphNode, GraphEdge, PathResult, NodeType, KonteksAkun } from "./types";

// Gilbert & Karahalios (2009), Figure 3; social distance & emotional support tak ada datanya. Lihat docs/pembobotan-relasi.md
const BOBOT_DIMENSI = {
  intimacy: 32.8,
  intensity: 19.7,
  duration: 16.5,
  services: 7.9,
  structural: 4.5,
};
type DimensiKontinu = "intimacy" | "intensity" | "duration" | "structural";

/** Indikator bersatuan sama dinormalisasi bersama, lintas jenis relasi. */
type Satuan =
  | "hariSejakKontakTerakhir"
  | "hariSejakKontakPertama"
  | "hariBersama"
  | "jumlahInteraksi"
  | "kenalanBersama"
  | "kontakDiAkun";

interface Indikator {
  satuan: Satuan;
  nilai: number;
}

interface CalonEdge {
  a: string;
  b: string;
  relasi: string;
  bukti: string;
  keterangan?: string; // bila bukti memuat ID; default = bukti
  ind: Partial<Record<DimensiKontinu, Indikator>>;
  services?: 0 | 1;
}

type Interaksi = RawData["interactions"][number];

interface StatInteraksi {
  n: number;
  awal: string;
  akhir: string;
  terakhir: Interaksi;
  kontak: Set<string>;
  konteksPelanggan: boolean;
}

const MS_PER_HARI = 86_400_000;
const selisihHari = (dari: string, sampai: string) => Math.round((Date.parse(sampai) - Date.parse(dari)) / MS_PER_HARI);
const kunciPasangan = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const lebihAwal = (a: string | undefined, b: string | undefined) => (!a ? b : !b ? a : a < b ? a : b);

/** Tanggal terakhir yang tercatat di dataset; semua "berapa hari sejak" dihitung terhadap tanggal ini. */
function tanggalAcuan(d: RawData): string {
  let maks = "";
  const cek = (t: string | undefined) => {
    if (t && t > maks) maks = t;
  };
  for (const it of d.interactions) cek(it.tanggal);
  for (const h of d.history) {
    cek(h.mulai);
    cek(h.selesai);
  }
  for (const dl of d.deals) {
    cek(dl.dibuat);
    cek(dl.stage_sejak);
  }
  return maks;
}

function catatInteraksi(map: Map<string, StatInteraksi>, key: string, it: Interaksi): StatInteraksi {
  let s = map.get(key);
  if (!s) {
    s = { n: 0, awal: it.tanggal, akhir: it.tanggal, terakhir: it, kontak: new Set(), konteksPelanggan: false };
    map.set(key, s);
  }
  s.n++;
  if (it.tanggal < s.awal) s.awal = it.tanggal;
  if (it.tanggal >= s.akhir) {
    s.akhir = it.tanggal;
    s.terakhir = it;
  }
  return s;
}

const JENIS_INTERAKSI: Record<string, string> = { email: "Email", catatan_meeting: "Meeting", email_internal: "Email internal" };

/** Sama dengan bukti interaksi, tapi tanpa ID interaksi dan nama tipe mentah, untuk ditampilkan di UI. */
function keteranganInteraksi(s: StatInteraksi): string {
  const jenis = JENIS_INTERAKSI[s.terakhir.tipe] || s.terakhir.tipe.replace(/_/g, " ");
  return s.n === 1
    ? `${jenis} '${s.terakhir.subjek}' (${s.akhir})`
    : `${s.n} interaksi (${s.awal} s.d. ${s.akhir}); terakhir ${jenis.toLowerCase()} '${s.terakhir.subjek}'`;
}

// Peran paling spesifik ditampilkan lebih dulu: champion lebih bermakna daripada sekadar pernah bekerja di sana.
const URUTAN_PERAN = ["CHAMPION_DARI", "ACCOUNT_OWNER", "MENANGANI_DEAL", "BEKERJA_DI", "PERNAH_BEKERJA_DI"];

/** Rata-rata berbobot dimensi yang tersedia; indikator di-ln(1+x) seperti di paper, lalu min-max per satuan. */
function hitungBobot(calon: CalonEdge[]): number[] {
  const rentang = new Map<Satuan, { lo: number; hi: number }>();
  for (const c of calon) {
    for (const ind of Object.values(c.ind)) {
      const z = Math.log1p(ind.nilai);
      const r = rentang.get(ind.satuan);
      if (!r) rentang.set(ind.satuan, { lo: z, hi: z });
      else {
        r.lo = Math.min(r.lo, z);
        r.hi = Math.max(r.hi, z);
      }
    }
  }
  return calon.map((c) => {
    let atas = 0;
    let bawah = 0;
    for (const [dim, ind] of Object.entries(c.ind) as [DimensiKontinu, Indikator][]) {
      const { lo, hi } = rentang.get(ind.satuan)!;
      if (hi === lo) continue; // tanpa variasi, indikator tidak membedakan apa pun
      const s = (Math.log1p(ind.nilai) - lo) / (hi - lo);
      atas += BOBOT_DIMENSI[dim] * (dim === "intimacy" ? 1 - s : s);
      bawah += BOBOT_DIMENSI[dim];
    }
    if (c.services !== undefined) {
      atas += BOBOT_DIMENSI.services * c.services;
      bawah += BOBOT_DIMENSI.services;
    }
    return Math.round((atas / bawah) * 1000) / 1000;
  });
}

/**
 * Context Graph untuk Relationship Path Finder.
 * Node: akun, kontak, karyawan KasirNusa.
 * Edge berbobot (0..1) = kekuatan relasi, dipakai untuk mencari jalur terkuat.
 */
export class ContextGraph {
  nodes = new Map<string, GraphNode>();
  adj = new Map<string, GraphEdge[]>();
  raw!: RawData;

  private addNode(id: string, tipe: NodeType, label: string, props: Record<string, string> = {}) {
    const existing = this.nodes.get(id);
    if (existing) {
      existing.props = { ...existing.props, ...props };
    } else {
      this.nodes.set(id, { id, tipe, label, props });
    }
  }

  private addEdge(a: string, b: string, relasi: string, bobot: number, bukti: string, keterangan = bukti) {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    this.adj.get(a)!.push({ from: a, to: b, relasi, bobot, bukti, keterangan });
    this.adj.get(b)!.push({ from: b, to: a, relasi, bobot, bukti, keterangan });
  }

  build(): this {
    const d = loadData();
    this.raw = d;
    const acuan = tanggalAcuan(d);

    for (const a of d.accounts) {
      this.addNode(a.account_id, "akun", a.nama, {
        tipe_akun: a.tipe,
        industri: a.industri,
        kota: a.kota,
        paket: a.paket,
        jumlah_outlet: a.jumlah_outlet,
        health: a.health_score_dashboard,
        nps: a.nps_terakhir,
        owner: a.account_owner_id,
        champion: a.champion_contact_id,
      });
    }
    const idByEmail = new Map<string, string>();
    for (const e of d.employees) {
      this.addNode(e.employee_id, "karyawan", e.nama, { jabatan: e.jabatan, email: e.email });
      if (e.email) idByEmail.set(e.email.toLowerCase(), e.employee_id);
    }
    for (const c of d.contacts) {
      this.addNode(c.contact_id, "kontak", c.nama, {
        jabatan: c.jabatan_saat_ini,
        email: c.email,
        akun: c.account_id_saat_ini,
      });
      if (c.email && !idByEmail.has(c.email.toLowerCase())) idByEmail.set(c.email.toLowerCase(), c.contact_id);
    }

    const calon: CalonEdge[] = [
      ...this.relasiKeanggotaan(d, acuan),
      ...this.relasiSalingKenal(d, acuan),
      ...this.relasiDariInteraksi(d, acuan, idByEmail),
    ];
    this.isiKenalanBersama(calon);
    const bobot = hitungBobot(calon);
    calon.forEach((c, i) => this.addEdge(c.a, c.b, c.relasi, bobot[i], c.bukti, c.keterangan));
    return this;
  }

  /** BEKERJA_DI / PERNAH_BEKERJA_DI: satu edge per pasangan kontak–akun, dari CRM + riwayat kerja. */
  private relasiKeanggotaan(d: RawData, acuan: string): CalonEdge[] {
    const agg = new Map<string, { cid: string; acc: string; aktif: boolean; mulai: string; selesai: string; hariKerja: number; bukti: string[] }>();
    const ambil = (cid: string, acc: string) => {
      const k = `${cid}|${acc}`;
      let m = agg.get(k);
      if (!m) {
        m = { cid, acc, aktif: false, mulai: "", selesai: "", hariKerja: 0, bukti: [] };
        agg.set(k, m);
      }
      return m;
    };
    for (const c of d.contacts) {
      const acc = c.account_id_saat_ini;
      if (acc && this.nodes.has(acc)) {
        const m = ambil(c.contact_id, acc);
        m.aktif = true;
        m.bukti.push(`CRM: ${c.nama} kini ${c.jabatan_saat_ini}`);
      }
    }
    for (const h of d.history) {
      if (!h.account_id || !this.nodes.has(h.account_id) || !h.mulai) continue;
      const m = ambil(h.contact_id, h.account_id);
      const selesai = h.selesai || acuan;
      if (!h.selesai) m.aktif = true;
      if (!m.mulai || h.mulai < m.mulai) m.mulai = h.mulai;
      if (selesai > m.selesai) m.selesai = selesai;
      m.hariKerja += selisihHari(h.mulai, selesai);
      m.bukti.push(`Riwayat: ${h.jabatan} di ${h.organisasi} (${h.mulai}–${h.selesai || "kini"})`);
    }
    return Array.from(agg.values()).map((m) => {
      const ind: CalonEdge["ind"] = {
        intimacy: { satuan: "hariSejakKontakTerakhir", nilai: m.aktif ? 0 : selisihHari(m.selesai, acuan) },
      };
      if (m.mulai) {
        ind.intensity = { satuan: "hariBersama", nilai: m.hariKerja };
        ind.duration = { satuan: "hariSejakKontakPertama", nilai: selisihHari(m.mulai, acuan) };
      }
      return { a: m.cid, b: m.acc, relasi: m.aktif ? "BEKERJA_DI" : "PERNAH_BEKERJA_DI", bukti: m.bukti.join("; "), ind };
    });
  }

  /** SALING_KENAL: kontak yang pernah satu organisasi pada periode beririsan, satu edge per pasangan. */
  private relasiSalingKenal(d: RawData, acuan: string): CalonEdge[] {
    const anggota = new Map<string, { cid: string; mulai: string; selesai: string; selesaiAsli: string; jabatan: string; org: string }[]>();
    for (const h of d.history) {
      if (!h.mulai) continue;
      const key = h.account_id ? h.account_id : `EXT::${h.organisasi}`;
      if (!anggota.has(key)) anggota.set(key, []);
      anggota.get(key)!.push({
        cid: h.contact_id,
        mulai: h.mulai,
        selesai: h.selesai || acuan,
        selesaiAsli: h.selesai,
        jabatan: h.jabatan,
        org: h.organisasi,
      });
    }

    const agg = new Map<string, { a: string; b: string; hari: number; awal: string; akhir: string; bukti: string[]; keterangan: string[] }>();
    for (const members of anggota.values()) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const m1 = members[i];
          const m2 = members[j];
          if (m1.cid === m2.cid) continue;
          const awal = m1.mulai > m2.mulai ? m1.mulai : m2.mulai;
          const akhir = m1.selesai < m2.selesai ? m1.selesai : m2.selesai;
          if (awal > akhir) continue;
          const k = kunciPasangan(m1.cid, m2.cid);
          let p = agg.get(k);
          if (!p) {
            p = { a: m1.cid, b: m2.cid, hari: 0, awal, akhir, bukti: [], keterangan: [] };
            agg.set(k, p);
          }
          p.hari += selisihHari(awal, akhir);
          if (awal < p.awal) p.awal = awal;
          if (akhir > p.akhir) p.akhir = akhir;
          const nama1 = this.nodes.get(m1.cid)?.label || m1.cid;
          const nama2 = this.nodes.get(m2.cid)?.label || m2.cid;
          const masihBersama = !m1.selesaiAsli && !m2.selesaiAsli;
          const akhirTampil = masihBersama ? "kini" : akhir;
          const isi =
            `${masihBersama ? "Rekan kerja" : "Mantan rekan kerja"} di ${m1.org}: ` +
            `${nama1} (${m1.jabatan}, ${m1.mulai}–${m1.selesaiAsli || "kini"}) & ` +
            `${nama2} (${m2.jabatan}, ${m2.mulai}–${m2.selesaiAsli || "kini"}). ` +
            `Periode beririsan ${awal}–${akhirTampil}.`;
          p.bukti.push(`${isi} Sumber: contact_employment_history.csv`);
          p.keterangan.push(isi);
        }
      }
    }
    return Array.from(agg.values()).map((p) => ({
      a: p.a,
      b: p.b,
      relasi: "SALING_KENAL",
      bukti: p.bukti.join(" | "),
      keterangan: p.keterangan.join(" | "),
      ind: {
        intimacy: { satuan: "hariSejakKontakTerakhir", nilai: selisihHari(p.akhir, acuan) },
        intensity: { satuan: "hariBersama", nilai: p.hari },
        duration: { satuan: "hariSejakKontakPertama", nilai: selisihHari(p.awal, acuan) },
      },
    }));
  }

  /** Relasi yang kekuatannya diukur dari log interaksi: BERINTERAKSI, ACCOUNT_OWNER, MENANGANI_DEAL, CHAMPION_DARI, REKAN_KERJA. */
  private relasiDariInteraksi(d: RawData, acuan: string, idByEmail: Map<string, string>): CalonEdge[] {
    const perPasangan = new Map<string, StatInteraksi>();
    const perKaryawanAkun = new Map<string, StatInteraksi>();
    const perKontak = new Map<string, StatInteraksi>();
    let awalLog = "";

    for (const it of d.interactions) {
      if (!awalLog || it.tanggal < awalLog) awalLog = it.tanggal;
      const pihak = new Set<string>();
      for (const p of String(it.peserta || "").split(";")) {
        const t = p.trim();
        if (this.nodes.has(t)) pihak.add(t);
      }
      for (const field of ["dari", "ke"]) {
        const id = idByEmail.get(String(it[field] || "").toLowerCase());
        if (id) pihak.add(id);
      }
      const arr = Array.from(pihak);
      const karyawan = arr.filter((id) => this.nodes.get(id)?.tipe === "karyawan");
      const kontak = arr.filter((id) => this.nodes.get(id)?.tipe === "kontak");
      const diAkunPelanggan = this.nodes.get(it.account_id)?.props.tipe_akun === "pelanggan";
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const s = catatInteraksi(perPasangan, kunciPasangan(arr[i], arr[j]), it);
          if (diAkunPelanggan) s.konteksPelanggan = true;
        }
      }
      if (it.account_id) {
        for (const e of karyawan) {
          const s = catatInteraksi(perKaryawanAkun, `${e}|${it.account_id}`, it);
          kontak.forEach((k) => s.kontak.add(k));
        }
      }
      if (karyawan.length > 0) for (const k of kontak) catatInteraksi(perKontak, k, it);
    }

    // Tanpa interaksi tercatat: kontak terakhir dianggap lebih lama dari seluruh periode log.
    const hariTanpaKontak = selisihHari(awalLog, acuan) + 1;
    const ringkas = (s: StatInteraksi | undefined) =>
      s ? `${s.n} interaksi tercatat, terakhir ${s.akhir}` : "belum ada interaksi tercatat";
    const indikatorKasirNusa = (s: StatInteraksi | undefined, awalLain?: string): CalonEdge["ind"] => {
      const awal = lebihAwal(s?.awal, awalLain);
      return {
        intimacy: { satuan: "hariSejakKontakTerakhir", nilai: s ? selisihHari(s.akhir, acuan) : hariTanpaKontak },
        intensity: { satuan: "jumlahInteraksi", nilai: s ? s.n : 0 },
        duration: { satuan: "hariSejakKontakPertama", nilai: awal ? selisihHari(awal, acuan) : 0 },
      };
    };

    const calon: CalonEdge[] = [];

    const dealPer = new Map<string, RawData["deals"]>();
    const awalDeal = new Map<string, string>();
    for (const dl of d.deals) {
      if (!this.nodes.has(dl.owner_id) || !this.nodes.has(dl.account_id)) continue;
      const k = `${dl.owner_id}|${dl.account_id}`;
      if (!dealPer.has(k)) dealPer.set(k, []);
      dealPer.get(k)!.push(dl);
      awalDeal.set(k, lebihAwal(awalDeal.get(k), dl.dibuat)!);
    }

    // Sebelum MENANGANI_DEAL: bobot keduanya seri bila pemegangnya sama, label ini yang dipilih.
    for (const a of d.accounts) {
      if (this.nodes.has(a.account_owner_id)) {
        const k = `${a.account_owner_id}|${a.account_id}`;
        const s = perKaryawanAkun.get(k);
        calon.push({
          a: a.account_owner_id,
          b: a.account_id,
          relasi: "ACCOUNT_OWNER",
          bukti: `Account owner KasirNusa untuk ${a.nama}; ${ringkas(s)}`,
          ind: { ...indikatorKasirNusa(s, awalDeal.get(k)), structural: { satuan: "kontakDiAkun", nilai: s ? s.kontak.size : 0 } },
          services: a.tipe === "pelanggan" ? 1 : 0,
        });
      }
      const champ = a.champion_contact_id;
      if (champ && this.nodes.has(champ)) {
        const s = perKontak.get(champ);
        calon.push({
          a: champ,
          b: a.account_id,
          relasi: "CHAMPION_DARI",
          bukti: `Champion CRM untuk ${a.nama}; ${ringkas(s)} dengan KasirNusa`,
          ind: indikatorKasirNusa(s),
          services: 1,
        });
      }
    }

    for (const [k, deals] of dealPer) {
      const [owner, acc] = k.split("|");
      const s = perKaryawanAkun.get(k);
      calon.push({
        a: owner,
        b: acc,
        relasi: "MENANGANI_DEAL",
        bukti: `${deals.map((dl) => `Deal ${dl.deal_id} (${dl.tipe}, ${dl.stage})`).join("; ")}; ${ringkas(s)}`,
        keterangan: `${deals.map((dl) => `Deal ${dl.tipe} (${dl.stage})`).join("; ")}; ${ringkas(s)}`,
        ind: { ...indikatorKasirNusa(s, awalDeal.get(k)), structural: { satuan: "kontakDiAkun", nilai: s ? s.kontak.size : 0 } },
        services: deals.some((dl) => dl.status === "Menang") ? 1 : 0,
      });
    }

    // Komunikasi internal tidak tercatat di CRM, jadi intensity & duration rekan kerja tidak terukur.
    const empIds = d.employees.map((e) => e.employee_id).filter((id) => this.nodes.has(id));
    for (let i = 0; i < empIds.length; i++) {
      for (let j = i + 1; j < empIds.length; j++) {
        calon.push({
          a: empIds[i],
          b: empIds[j],
          relasi: "REKAN_KERJA",
          bukti: "Satu tim di KasirNusa",
          ind: { intimacy: { satuan: "hariSejakKontakTerakhir", nilai: 0 } },
          services: 1,
        });
      }
    }

    for (const [k, s] of perPasangan) {
      const [a, b] = k.split("|");
      const tipeA = this.nodes.get(a)!.tipe;
      const tipeB = this.nodes.get(b)!.tipe;
      // Services dari konteks interaksinya (akun pelanggan), bukan akun kontak saat ini.
      let services: 0 | 1 | undefined;
      if (tipeA === "karyawan" && tipeB === "karyawan") services = 1;
      else if (tipeA === "karyawan" || tipeB === "karyawan") services = s.konteksPelanggan ? 1 : 0;
      calon.push({
        a,
        b,
        relasi: "BERINTERAKSI",
        bukti: `${s.n} interaksi (${s.awal} s.d. ${s.akhir}); terakhir ${s.terakhir.tipe} ${s.terakhir.interaction_id} '${s.terakhir.subjek}'`,
        keterangan: keteranganInteraksi(s),
        ind: indikatorKasirNusa(s),
        services,
      });
    }
    return calon;
  }

  /** Dimensi structural relasi antar orang: jumlah kenalan bersama (mutual friends di paper). */
  private isiKenalanBersama(calon: CalonEdge[]) {
    const antarOrang = calon.filter(
      (c) =>
        (c.relasi === "SALING_KENAL" || c.relasi === "BERINTERAKSI" || c.relasi === "REKAN_KERJA") &&
        this.nodes.get(c.a)?.tipe !== "akun" &&
        this.nodes.get(c.b)?.tipe !== "akun"
    );
    const tetangga = new Map<string, Set<string>>();
    const tambah = (x: string, y: string) => {
      if (!tetangga.has(x)) tetangga.set(x, new Set());
      tetangga.get(x)!.add(y);
    };
    for (const c of antarOrang) {
      tambah(c.a, c.b);
      tambah(c.b, c.a);
    }
    for (const c of antarOrang) {
      const nb = tetangga.get(c.b)!;
      let bersama = 0;
      for (const x of tetangga.get(c.a)!) if (nb.has(x)) bersama++;
      c.ind.structural = { satuan: "kenalanBersama", nilai: bersama };
    }
  }

  /** Kekuatan relasi didefinisikan antar-orang, jadi akun hanya boleh di ujung jalur, bukan perantara. */
  private bisaDilewati(id: string, source: string): boolean {
    return id === source || this.nodes.get(id)?.tipe !== "akun";
  }

  /** Relasi seseorang ke tiap akun, peran paling spesifik lebih dulu. */
  private peranDiAkun(id: string): Map<string, string[]> {
    const peran = new Map<string, string[]>();
    for (const e of this.adj.get(id) || []) {
      if (this.nodes.get(e.to)?.tipe !== "akun") continue;
      if (!peran.has(e.to)) peran.set(e.to, []);
      peran.get(e.to)!.push(e.relasi);
    }
    for (const daftar of peran.values()) daftar.sort((x, y) => URUTAN_PERAN.indexOf(x) - URUTAN_PERAN.indexOf(y));
    return peran;
  }

  /**
   * Akun yang menghubungkan dua orang di satu langkah jalur (mis. account owner & champion akun yang sama).
   * Jalur tidak melewati node akun, jadi relasi seperti CHAMPION_DARI ditampilkan lewat konteks ini.
   */
  private konteksAkun(dari: string, ke: string): KonteksAkun[] {
    const peranDari = this.peranDiAkun(dari);
    const peranKe = this.peranDiAkun(ke);
    const peringkat = (k: KonteksAkun) => Math.min(...[...k.relasiDari, ...k.relasiKe].map((r) => URUTAN_PERAN.indexOf(r)));
    return Array.from(peranDari)
      .filter(([akun]) => peranKe.has(akun))
      .map(([akun, relasiDari]) => ({ akun: this.nodes.get(akun)!.label, relasiDari, relasiKe: peranKe.get(akun)! }))
      .sort((x, y) => peringkat(x) - peringkat(y));
  }

  /** Jalur TERKUAT: Dijkstra pada biaya -log(bobot) => memaksimalkan produk bobot. */
  strongestPath(source: string, target: string): PathResult | null {
    if (!this.nodes.has(source) || !this.nodes.has(target)) return null;
    const dist = new Map<string, number>([[source, 0]]);
    const prev = new Map<string, string>();
    const prevEdge = new Map<string, GraphEdge>();
    const visited = new Set<string>();
    // priority queue sederhana
    const pq: [number, string][] = [[0, source]];
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [dUp, u] = pq.shift()!;
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === target) break;
      if (!this.bisaDilewati(u, source)) continue;
      for (const e of this.adj.get(u) || []) {
        if (e.bobot <= 0) continue;
        const nd = dUp + -Math.log(e.bobot);
        if (!dist.has(e.to) || nd < dist.get(e.to)!) {
          dist.set(e.to, nd);
          prev.set(e.to, u);
          prevEdge.set(e.to, e);
          pq.push([nd, e.to]);
        }
      }
    }
    if (!dist.has(target)) return null;
    return this.reconstruct(source, target, prev, prevEdge, Math.exp(-dist.get(target)!));
  }

  /** Jalur TERPENDEK: BFS (jumlah hop paling sedikit). */
  shortestPath(source: string, target: string): PathResult | null {
    if (!this.nodes.has(source) || !this.nodes.has(target)) return null;
    const prev = new Map<string, string | null>([[source, null]]);
    const prevEdge = new Map<string, GraphEdge>();
    const queue = [source];
    while (queue.length) {
      const u = queue.shift()!;
      if (u === target) break;
      if (!this.bisaDilewati(u, source)) continue;
      for (const e of this.adj.get(u) || []) {
        if (!prev.has(e.to)) {
          prev.set(e.to, u);
          prevEdge.set(e.to, e);
          queue.push(e.to);
        }
      }
    }
    if (!prev.has(target)) return null;
    // hitung skor (produk bobot) untuk info
    let skor = 1;
    const res = this.reconstruct(source, target, prev as Map<string, string>, prevEdge, 1);
    if (res) {
      for (const e of res.edges) skor *= e.bobot;
      res.skor = Math.round(skor * 10000) / 10000;
    }
    return res;
  }

  private reconstruct(
    source: string,
    target: string,
    prev: Map<string, string>,
    prevEdge: Map<string, GraphEdge>,
    skor: number
  ): PathResult {
    const nodeIds = [target];
    const edges: GraphEdge[] = [];
    let cur = target;
    while (cur !== source) {
      const e = prevEdge.get(cur)!;
      const dari = prev.get(cur)!;
      const antarOrang = this.nodes.get(dari)?.tipe !== "akun" && this.nodes.get(cur)?.tipe !== "akun";
      const konteks = antarOrang ? this.konteksAkun(dari, cur) : [];
      edges.push({ ...e, from: dari, to: cur, ...(konteks.length ? { konteksAkun: konteks } : {}) });
      cur = dari;
      nodeIds.push(cur);
    }
    nodeIds.reverse();
    edges.reverse();
    return {
      nodes: nodeIds.map((id) => this.nodes.get(id)!),
      edges,
      skor: Math.round(skor * 10000) / 10000,
      panjang: edges.length,
    };
  }
}

// Singleton agar graph dibangun sekali per proses server
let instance: ContextGraph | null = null;
export function getGraph(): ContextGraph {
  if (!instance) instance = new ContextGraph().build();
  return instance;
}
