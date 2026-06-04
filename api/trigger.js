// File ini berfungsi sebagai "Lonceng" antara Bot WA dan Ekstensi Chrome
let needsRefresh = false;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Bot WA mengirim POST untuk menyalakan lonceng
    if (req.method === 'POST') {
        needsRefresh = req.body.refresh;
        return res.status(200).json({ status: true, needsRefresh });
    }

    // Ekstensi Chrome melakukan GET untuk mengecek lonceng
    if (req.method === 'GET') {
        return res.status(200).json({ needsRefresh });
    }
};