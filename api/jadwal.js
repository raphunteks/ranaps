// Menggunakan Global Variabel sebagai Database Sementara (In-Memory)
// Catatan: Karena Vercel adalah Serverless, data ini akan reset jika server tidur (idle).
// Namun karena Ekstensi Anda melakukan auto-scrape & POST terus-menerus, data akan selalu terisi kembali.
let cachedData = [];
let lastUpdated = null;

module.exports = async (req, res) => {
    // 1. Konfigurasi CORS 
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ==========================================
    // METODE POST: MENERIMA DATA DARI EKSTENSI CHROME
    // ==========================================
    if (req.method === 'POST') {
        try {
            const dataDariEkstensi = req.body;
            
            if (!Array.isArray(dataDariEkstensi)) {
                return res.status(400).json({ status: false, message: "Format data harus berupa Array." });
            }

            // Simpan data ke memori sementara (Cache)
            cachedData = dataDariEkstensi;
            lastUpdated = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA';

            return res.status(200).json({
                status: true,
                message: "Data berhasil diterima dan disinkronkan ke Vercel.",
                total_data_diterima: cachedData.length,
                last_updated: lastUpdated
            });
        } catch (error) {
            return res.status(500).json({ status: false, error: error.message });
        }
    }

    // ==========================================
    // METODE GET: DIAMBIL OLEH WHATSAPP BOT & MASTER TAB
    // ==========================================
    if (req.method === 'GET') {
        const { cari, dokter, tanggal } = req.query;
        let filteredData = cachedData;

        // Logika Filter
        if (cari) {
            const cariLower = cari.toLowerCase();
            filteredData = filteredData.filter(item => 
                item.nama_pasien.toLowerCase().includes(cariLower) || 
                item.no_rm.toLowerCase().includes(cariLower)
            );
        }

        if (dokter) {
            const dokterLower = dokter.toLowerCase();
            filteredData = filteredData.filter(item => 
                item.dpjp_utama.toLowerCase().includes(dokterLower) || 
                item.dokter_rawat_bersama.toLowerCase().includes(dokterLower)
            );
        }

        if (tanggal) {
            const [y, m, d] = tanggal.split('-');
            const formatIndoSearch = `${d}-${m}-${y}`; 
            filteredData = filteredData.filter(item => item.tanggal_masuk.includes(formatIndoSearch));
        }

        if (cachedData.length === 0) {
             return res.status(200).json({
                status: true,
                total_data: 0,
                data: [],
                last_updated: null,
                message: "Belum ada data. Pastikan Chrome Extension sedang berjalan dan fitur Auto-Scrape menyala."
            });
        }

        return res.status(200).json({
            status: true,
            total_data: filteredData.length,
            last_updated: lastUpdated,
            data: filteredData
        });
    }
};
