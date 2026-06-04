let needsRefresh = false;
let pendingNotification = "";

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        if (req.body.refresh !== undefined) needsRefresh = req.body.refresh;
        if (req.body.notify !== undefined) pendingNotification = req.body.notify;
        return res.status(200).json({ status: true, needsRefresh, notify: pendingNotification });
    }

    if (req.method === 'GET') {
        let currentNotif = pendingNotification;
        pendingNotification = ""; // Kosongkan setelah dibaca oleh Bot WA
        return res.status(200).json({ needsRefresh, notify: currentNotif });
    }
};
