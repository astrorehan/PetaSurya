// Klien API ke services/engine. Alamat dasar diambil dari lingkungan agar
// pengembangan lokal (:8000) dan produksi memakai kode yang sama.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
