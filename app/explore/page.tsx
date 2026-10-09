import Link from "next/link";
import GraphExplorer from "./GraphExplorer";

export default function ExplorePage() {
  return (
    <div className="container">
      <header className="top">
        <h1>🕸️ Explore Context Graph</h1>
        <span className="chip">215 node · 1.141 relasi</span>
        <Link href="/" className="nav-link">← Kembali ke Path Finder</Link>
      </header>
      <p className="subtitle">
        Seluruh graph yang dibangun otomatis dari 5 sumber data. Filter relasi, zoom, dan klik node untuk menelusuri koneksi.
      </p>
      <div className="card">
        <GraphExplorer />
      </div>
    </div>
  );
}
