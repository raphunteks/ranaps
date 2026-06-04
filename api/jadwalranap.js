let cachedData = [];
let lastUpdated = null;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        try {
            cachedData = req.body;
            lastUpdated = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA';
            return res.status(200).json({ status: true, message: "Ranap OK", total: cachedData.length });
        } catch (error) {
            return res.status(500).json({ status: false, error: error.message });
        }
    }

    if (req.method === 'GET') {
        const { cari, dokter, tanggal } = req.query;
        let filteredData = cachedData;

        if (cari) {
            const c = cari.toLowerCase();
            filteredData = filteredData.filter(i => i.nama_pasien.toLowerCase().includes(c) || i.no_rm.toLowerCase().includes(c));
        }
        if (dokter) {
            const d = dokter.toLowerCase();
            filteredData = filteredData.filter(i => i.dpjp_utama.toLowerCase().includes(d) || i.dokter_rawat_bersama.toLowerCase().includes(d));
        }
        if (tanggal) {
            const [y, m, d] = tanggal.split('-');
            const fmt = `${d}-${m}-${y}`; 
            filteredData = filteredData.filter(i => i.tanggal_masuk.includes(fmt));
        }

        if (cachedData.length === 0) {
             return res.status(200).json({ status: true, total_data: 0, data: [], message: "Belum ada data Ranap. Auto-Scrape belum berjalan." });
        }

        return res.status(200).json({ status: true, total_data: filteredData.length, last_updated: lastUpdated, data: filteredData });
    }
};
