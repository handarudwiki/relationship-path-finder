import { loadData, RawData } from "./data";
import { GraphNode, GraphEdge, PathResult, NodeType } from "./types";

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

  private addEdge(a: string, b: string, relasi: string, bobot: number, bukti: string) {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    this.adj.get(a)!.push({ from: a, to: b, relasi, bobot, bukti });
    this.adj.get(b)!.push({ from: b, to: a, relasi, bobot, bukti });
  }

  private static overlap(s1: string, e1: string, s2: string, e2: string): boolean {
    const a1 = s1 || "0000-00-00";
    const a2 = s2 || "0000-00-00";
    const b1 = e1 || "9999-99-99";
    const b2 = e2 || "9999-99-99";
    return a1 <= b2 && a2 <= b1;
  }

  build(): this {
    const d = loadData();
    this.raw = d;

    // Akun
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

    // Karyawan
    const emailToEmp = new Map<string, string>();
    for (const e of d.employees) {
      this.addNode(e.employee_id, "karyawan", e.nama, {
        jabatan: e.jabatan,
        email: e.email,
      });
      if (e.email) emailToEmp.set(e.email.toLowerCase(), e.employee_id);
    }

    // Kontak + BEKERJA_DI akun saat ini
    const emailToContact = new Map<string, string>();
    for (const c of d.contacts) {
      this.addNode(c.contact_id, "kontak", c.nama, {
        jabatan: c.jabatan_saat_ini,
        email: c.email,
        akun: c.account_id_saat_ini,
      });
      if (c.email) emailToContact.set(c.email.toLowerCase(), c.contact_id);
      const acc = c.account_id_saat_ini;
      if (acc && this.nodes.has(acc)) {
        // Kontak di PELANGGAN = hubungan tepercaya (0.9).
        // Kontak di PROSPEK = kita belum tentu sudah akrab; edge langsung lebih lemah (0.5)
        // supaya jalur hangat lewat relasi lama bisa menang jadi "terkuat".
        const accNode = this.nodes.get(acc)!;
        const bobot = accNode.props.tipe_akun === "pelanggan" ? 0.9 : 0.5;
        this.addEdge(c.contact_id, acc, "BEKERJA_DI", bobot, `CRM: ${c.nama} kini ${c.jabatan_saat_ini}`);
      }
    }

    // Riwayat kerja -> PERNAH_BEKERJA_DI + SALING_KENAL (rekan seperiode)
    const orgMembers = new Map<string, { cid: string; mulai: string; selesai: string; jabatan: string; org: string }[]>();
    for (const h of d.history) {
      const cid = h.contact_id;
      const acc = h.account_id;
      const org = h.organisasi;
      const key = acc ? acc : `EXT::${org}`;
      if (!orgMembers.has(key)) orgMembers.set(key, []);
      orgMembers.get(key)!.push({ cid, mulai: h.mulai, selesai: h.selesai, jabatan: h.jabatan, org });

      if (acc && this.nodes.has(acc)) {
        const aktif = h.selesai === "";
        const relasi = aktif ? "BEKERJA_DI" : "PERNAH_BEKERJA_DI";
        const bobot = aktif ? 0.85 : 0.6;
        this.addEdge(
          cid,
          acc,
          relasi,
          bobot,
          `Riwayat: ${h.jabatan} di ${org} (${h.mulai}–${h.selesai || "kini"})`
        );
      }
    }

    // SALING_KENAL antar kontak di organisasi sama dengan periode tumpang tindih.
    // Bukti menyertakan jabatan masing-masing + jendela periode yang benar-benar beririsan,
    // supaya relasi ini bisa diverifikasi langsung ke contact_employment_history.csv.
    for (const [, members] of orgMembers) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const m1 = members[i];
          const m2 = members[j];
          if (m1.cid === m2.cid) continue;
          if (ContextGraph.overlap(m1.mulai, m1.selesai, m2.mulai, m2.selesai)) {
            const nama1 = this.nodes.get(m1.cid)?.label || m1.cid;
            const nama2 = this.nodes.get(m2.cid)?.label || m2.cid;
            // jendela irisan = max(mulai) .. min(selesai)
            const mulaiIrisan = (m1.mulai || "") > (m2.mulai || "") ? m1.mulai : m2.mulai;
            const s1 = m1.selesai || "9999-12-31";
            const s2 = m2.selesai || "9999-12-31";
            const selesaiRaw = s1 < s2 ? s1 : s2;
            const selesaiIrisan = selesaiRaw === "9999-12-31" ? "kini" : selesaiRaw;
            const periode1 = `${m1.mulai}–${m1.selesai || "kini"}`;
            const periode2 = `${m2.mulai}–${m2.selesai || "kini"}`;
            const bukti =
              `Mantan rekan kerja di ${m1.org}: ` +
              `${nama1} (${m1.jabatan}, ${periode1}) & ${nama2} (${m2.jabatan}, ${periode2}). ` +
              `Periode beririsan ${mulaiIrisan}–${selesaiIrisan}. Sumber: contact_employment_history.csv`;
            this.addEdge(m1.cid, m2.cid, "SALING_KENAL", 0.7, bukti);
          }
        }
      }
    }

    // Deal owner & account owner & champion
    // Catatan bobot: MENANGANI_DEAL/ACCOUNT_OWNER = pendekatan langsung ke prospek yang
    // sering MACET. Dibuat lemah supaya jalur "terkuat" lebih memilih jalur hangat lewat
    // relasi tepercaya (champion/mantan kolega), bukan sekadar jalur langsung terpendek.
    for (const dl of d.deals) {
      if (this.nodes.has(dl.owner_id) && this.nodes.has(dl.account_id)) {
        this.addEdge(dl.owner_id, dl.account_id, "MENANGANI_DEAL", 0.35, `Deal ${dl.deal_id} (${dl.tipe}, ${dl.stage})`);
      }
    }
    for (const a of d.accounts) {
      if (this.nodes.has(a.account_owner_id)) {
        // owner akun pelanggan (hubungan kuat) vs owner prospek (baru, lemah)
        const bobot = a.tipe === "pelanggan" ? 0.8 : 0.35;
        this.addEdge(a.account_owner_id, a.account_id, "ACCOUNT_OWNER", bobot, `Account owner KasirNusa untuk ${a.nama}`);
      }
      if (a.champion_contact_id && this.nodes.has(a.champion_contact_id)) {
        this.addEdge(a.champion_contact_id, a.account_id, "CHAMPION_DARI", 0.95, `Champion CRM untuk ${a.nama}`);
      }
    }

    // Kolega internal KasirNusa: semua karyawan saling kenal (satu perusahaan kecil, 10 orang).
    // Ini memungkinkan jalur "minta tolong rekan yang memegang akun pelanggan terkait".
    const empIds = d.employees.map((e) => e.employee_id).filter((id) => this.nodes.has(id));
    for (let i = 0; i < empIds.length; i++) {
      for (let j = i + 1; j < empIds.length; j++) {
        this.addEdge(empIds[i], empIds[j], "REKAN_KERJA", 0.9, "Satu tim di KasirNusa");
      }
    }

    // Interaksi (email/meeting) -> BERINTERAKSI antar pihak
    for (const it of d.interactions) {
      const parties = new Set<string>();
      const peserta: string = it.peserta || "";
      if (peserta) {
        for (const p of peserta.split(";")) {
          const t = p.trim();
          if (this.nodes.has(t)) parties.add(t);
        }
      }
      for (const field of ["dari", "ke"]) {
        const val = (it[field] || "").toLowerCase();
        if (emailToEmp.has(val)) parties.add(emailToEmp.get(val)!);
        else if (emailToContact.has(val)) parties.add(emailToContact.get(val)!);
      }
      const arr = Array.from(parties);
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          this.addEdge(arr[i], arr[j], "BERINTERAKSI", 0.55, `${it.tipe} ${it.interaction_id} '${it.subjek}' (${it.tanggal})`);
        }
      }
    }

    return this;
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
      edges.push({ ...e, from: prev.get(cur)!, to: cur });
      cur = prev.get(cur)!;
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
