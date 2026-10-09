export type NodeType = "akun" | "kontak" | "karyawan";

export interface GraphNode {
  id: string;
  tipe: NodeType;
  label: string;
  props: Record<string, string>;
}

export interface GraphEdge {
  from: string;
  to: string;
  relasi: string;
  bobot: number; // kekuatan relasi 0..1
  bukti: string;
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
