let needsRefresh = false;
let pendingNotification = "";
let nextScrapeTime = 0; // JEMBATAN WAKTU AUTO-SCRAPE REAL-TIME

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        if (req.body.refresh !== undefined) needsRefresh = req.body.refresh;
        if (req.body.notify !== undefined) pendingNotification = req.body.notify;
        if (req.body.nextScrapeTime !== undefined) nextScrapeTime = req.body.nextScrapeTime; // Simpan waktu dari Ekstensi
        return res.status(200).json({ status: true, needsRefresh, notify: pendingNotification, nextScrapeTime });
    }

    if (req.method === 'GET') {
        let currentNotif = pendingNotification;
        pendingNotification = ""; // Kosongkan setelah dibaca oleh Bot WA
        // Kembalikan waktu ke Website Vercel
        return res.status(200).json({ needsRefresh, notify: currentNotif, nextScrapeTime });
    }
};
