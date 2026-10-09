export type NodeType = "akun" | "kontak" | "karyawan";

export interface GraphNode {
  id: string;
  tipe: NodeType;
  label: string;
  props: Record<string, string>;
}

/** Akun yang menghubungkan dua orang di satu langkah jalur, mis. account owner & champion akun yang sama. */
export interface KonteksAkun {
  akun: string;
  relasiDari: string[]; // relasi orang di awal langkah ke akun ini
  relasiKe: string[]; // relasi orang di akhir langkah ke akun ini
}

export interface GraphEdge {
  from: string;
  to: string;
  relasi: string;
  bobot: number; // kekuatan relasi 0..1
  bukti: string; // lengkap dengan ID sumber, untuk konteks AI
  keterangan: string; // bukti tanpa ID/kode, untuk ditampilkan di UI
  konteksAkun?: KonteksAkun[]; // hanya di jalur, untuk langkah antar-orang
}

export interface PathResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  skor: number; // produk bobot sepanjang jalur (untuk strongest)
  panjang: number; // jumlah hop
}

export interface DecisionMaker {
  contactId: string;
  nama: string;
  jabatan: string;
  alasan: string;
  bukti: string[];
}

export interface ProspectAnalysis {
  accountId: string;
  nama: string;
  industri: string;
  outlet: number;
  nilaiTahunan: number;
  stage: string;
  decisionMaker: DecisionMaker | null;
  shortest: PathResult | null;
  strongest: PathResult | null;
  referensiPelanggan: { accountId: string; nama: string; alasan: string } | null;
  draftPesan: string;
  catatan: string[];
}
