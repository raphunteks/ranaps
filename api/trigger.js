// BIG UPGRADE: Menyimpan state lengkap secara independen untuk masing-masing 9 layanan
let endpointsData = {
    'Ranap': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalBM_AntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalBM_RiwayatAntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalEndo_AntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalEndo_RiwayatAntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalPerio_AntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalPerio_RiwayatAntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalUmum_AntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" },
    'RajalUmum_RiwayatAntrianPx': { needsRefresh: false, notify: "", nextScrapeTime: 0, isScraping: false, lastUpdateStr: "" }
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        // Mode 1: Update banyak endpoint sekaligus (Batch)
        if (req.body.batch) {
            req.body.batch.forEach(item => {
                if (endpointsData[item.endpoint]) {
                    Object.assign(endpointsData[item.endpoint], item.payload);
                }
            });
        } 
        // Mode 2: Update 1 endpoint spesifik
        else if (req.body.endpoint && endpointsData[req.body.endpoint]) {
            Object.assign(endpointsData[req.body.endpoint], req.body.payload);
        } 
        // Mode 3: Update pengaturan global (terapkan ke semua endpoint)
        else if (req.body.global) {
            Object.keys(endpointsData).forEach(ep => {
                Object.assign(endpointsData[ep], req.body.global);
            });
        }
        
        return res.status(200).json({ status: true, endpoints: endpointsData });
    }

    if (req.method === 'GET') {
        // Salin data dan bersihkan notifikasi setelah dibaca
        let copyData = JSON.parse(JSON.stringify(endpointsData));
        Object.keys(endpointsData).forEach(ep => { endpointsData[ep].notify = ""; });
        return res.status(200).json({ endpoints: copyData });
    }
};
