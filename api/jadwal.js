const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

module.exports = async (req, res) => {
    // 1. Konfigurasi CORS Super Longgar untuk Vercel
    const allowedOrigins = ['https://ishiprsud.vercel.app', 'http://localhost:3000'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { cari, dokter, tanggal } = req.query;
        const targetUrl = 'https://rsudkendari.periksa.tech/rawat-inap/antrian-pasien-rawat-inap';

        // 2. Bypass Agen HTTPS untuk melewati proteksi SSL/WAF ketat
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });

        // 3. Request Spoofing Tingkat Tinggi (Menyamar sebagai Browser Asli)
        const response = await axios.get(targetUrl, {
            httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 12000 // Waktu tunggu dinaikkan agar tidak terputus
        });

        // 4. Parsing HTML Universal dengan Cheerio
        const $ = cheerio.load(response.data);
        const jadwalRanap = [];

        // Mencari semua baris tabel (tanpa bergantung pada class spesifik Angular agar lebih tahan banting)
        $('table tbody tr').each((index, element) => {
            const tds = $(element).find('td');
            
            if (tds.length >= 7) { 
                // Ekstraksi Ruangan & Kamar
                const ruangan = $(tds[1]).find('span.mb-1').first().text().trim() || $(tds[1]).text().trim();
                const no_kamar = $(tds[1]).find('div.text-muted').text().trim();

                // Ekstraksi Data Pasien
                const patientRawText = $(tds[3]).find('span.mb-1').first().text().trim();
                const patientParts = patientRawText.split(' - '); 
                const no_rm = patientParts[0] ? patientParts[0].trim() : '-';
                const nama_pasien = patientParts[1] ? patientParts.slice(1).join(' - ').trim() : patientRawText;
                
                const tglLahirRaw = $(tds[3]).find('span.mb-1').eq(1).text().trim(); 
                const tanggal_lahir = tglLahirRaw.replace('Tanggal Lahir:', '').trim();

                // Kalkulasi Usia
                let usia = '-';
                if (tanggal_lahir && tanggal_lahir.length >= 10) {
                    const parts = tanggal_lahir.split('-');
                    if(parts.length === 3) {
                        const birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        if (today.getMonth() - birthDate.getMonth() < 0 || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                        usia = `${age} Tahun`;
                    }
                }

                // Ekstraksi Dokter
                const listDokter = $(tds[5]).find('ul');
                const dpjp_utama = $(listDokter[0]).find('li').first().text().trim();
                
                let dokter_rawat_bersama = '-';
                if (listDokter.length > 1) {
                    const rawatBersamaArr = [];
                    $(listDokter[1]).find('li').each((i, li) => {
                        const drName = $(li).text().trim();
                        if (drName && drName !== dpjp_utama) rawatBersamaArr.push(drName);
                    });
                    if (rawatBersamaArr.length > 0) dokter_rawat_bersama = rawatBersamaArr.join(', ');
                }

                // Ekstraksi Registrasi
                const lamaRawatRaw = $(tds[7]).find('div.text-muted').first().text().trim();
                const lama_rawat = lamaRawatRaw.replace('Lama Rawat:', '').trim();
                const tglSpans = $(tds[7]).find('span.text-primary');
                const tanggal_masuk = tglSpans.length > 1 ? $(tglSpans[1]).text().trim() : $(tglSpans[0]).text().trim();

                if (nama_pasien && nama_pasien !== '') {
                    jadwalRanap.push({ ruangan, no_kamar, no_rm, nama_pasien, tanggal_lahir, usia, dpjp_utama, dokter_rawat_bersama, tanggal_masuk, lama_rawat });
                }
            }
        });

        // 5. Logika Filter
        let filteredData = jadwalRanap;

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

        // ==========================================
        // FITUR DETEKSI CSR (CLIENT-SIDE RENDERING)
        // ==========================================
        if (jadwalRanap.length === 0) {
            return res.status(200).json({
                status: true,
                total_data: 0,
                data: [],
                message: "Web berhasil diakses, tapi tabel kosong. Ini terjadi karena RSUD menggunakan Angular (Client-Side Rendering) dimana data dipanggil lewat API internal mereka, bukan ditanam di HTML. Anda perlu mencari URL API asli RSUD tersebut di tab Network.",
            });
        }

        // 6. Kembalikan Response Sukses
        return res.status(200).json({
            status: true,
            total_data: filteredData.length,
            data: filteredData
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: 'Gagal melakukan scraping data ke server target.',
            error: error.message
        });
    }
};
