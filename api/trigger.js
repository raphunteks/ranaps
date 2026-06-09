let needsRefresh = false;
let pendingNotification = "";
let nextScrapeTime = 0;
let isScraping = false;

// Menyimpan Memori Update masing-masing 9 layanan Poliklinik
let updates = {
    lastUpdateStrRanap: "",
    lastUpdateStrRajalAntrianEndo: "",
    lastUpdateStrRajalRiwayatEndo: "",
    lastUpdateStrRajalAntrianBM: "",
    lastUpdateStrRajalRiwayatBM: "",
    lastUpdateStrRajalAntrianPerio: "",
    lastUpdateStrRajalRiwayatPerio: "",
    lastUpdateStrRajalAntrianUmum: "",
    lastUpdateStrRajalRiwayatUmum: ""
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        if (req.body.refresh !== undefined) needsRefresh = req.body.refresh;
        if (req.body.notify !== undefined) pendingNotification = req.body.notify;
        if (req.body.nextScrapeTime !== undefined) nextScrapeTime = req.body.nextScrapeTime;
        if (req.body.isScraping !== undefined) isScraping = req.body.isScraping;
        
        // Membaca dan menyimpan setiap Update Timestamp spesifik per Endpoint
        Object.keys(updates).forEach(key => {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        });

        return res.status(200).json({ status: true, needsRefresh, notify: pendingNotification, nextScrapeTime, isScraping, updates });
    }

    if (req.method === 'GET') {
        let currentNotif = pendingNotification;
        pendingNotification = ""; 
        return res.status(200).json({ needsRefresh, notify: currentNotif, nextScrapeTime, isScraping, updates });
    }
};
