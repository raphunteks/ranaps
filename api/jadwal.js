const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // 1. Konfigurasi CORS agar bisa diakses dari frontend web Anda
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
        // 2. Tangkap parameter filter opsional dari URL query
        const { cari, dokter, tanggal } = req.query;
        const targetUrl = 'https://rsudkendari.periksa.tech/rawat-inap/antrian-pasien-rawat-inap';

        // 3. Request Spoofing (Menyamar sebagai Browser) untuk bypass WAF/Cloudfront
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Priority': 'u=0, i'
            },
            timeout: 9000 // Timeout 9 detik agar tidak melampaui batas serverless Vercel (10s)
        });

        // 4. Parsing HTML dengan Cheerio
        const $ = cheerio.load(response.data);
        const jadwalRanap = [];

        // Mencari semua baris tabel yang dirender Angular (class ng-star-inserted)
        $('tbody tr.ng-star-inserted').each((index, element) => {
            const tds = $(element).find('td');
            
            if (tds.length >= 8) {
                // Ekstraksi Kolom 1 (Index 1): Ruangan & No Kamar
                const ruangan = $(tds[1]).find('span.mb-1').first().text().trim();
                const no_kamar = $(tds[1]).find('div.text-muted').text().trim();

                // Ekstraksi Kolom 3 (Index 3): Data Pasien (No RM, Nama, TTL)
                const patientRawText = $(tds[3]).find('span.mb-1').first().text().trim();
                const patientParts = patientRawText.split(' - '); 
                const no_rm = patientParts[0] ? patientParts[0].trim() : '-';
                const nama_pasien = patientParts[1] ? patientParts.slice(1).join(' - ').trim() : patientRawText;
                
                const tglLahirRaw = $(tds[3]).find('span.mb-1').eq(1).text().trim(); 
                const tanggal_lahir = tglLahirRaw.replace('Tanggal Lahir:', '').trim();

                // Kalkulasi Usia dari Tanggal Lahir (Format DD-MM-YYYY)
                let usia = '-';
                if (tanggal_lahir && tanggal_lahir.length >= 10) {
                    const parts = tanggal_lahir.split('-');
                    if(parts.length === 3) {
                        const birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const mDiff = today.getMonth() - birthDate.getMonth();
                        if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                        usia = `${age} Tahun`;
                    }
                }

                // Ekstraksi Kolom 5 (Index 5): Dokter (DPJP & Rawat Bersama)
                const listDokter = $(tds[5]).find('ul');
                const dpjp_utama = $(listDokter[0]).find('li').first().text().trim();
                
                let dokter_rawat_bersama = '-';
                if (listDokter.length > 1) {
                    const rawatBersamaArr = [];
                    $(listDokter[1]).find('li').each((i, li) => {
                        const drName = $(li).text().trim();
                        if (drName && drName !== dpjp_utama) {
                            rawatBersamaArr.push(drName);
                        }
                    });
                    if (rawatBersamaArr.length > 0) {
                        dokter_rawat_bersama = rawatBersamaArr.join(', ');
                    }
                }

                // Ekstraksi Kolom 7 (Index 7): Registrasi (Tgl Masuk & Lama Rawat)
                const lamaRawatRaw = $(tds[7]).find('div.text-muted').first().text().trim();
                const lama_rawat = lamaRawatRaw.replace('Lama Rawat:', '').trim();
                
                const tglSpans = $(tds[7]).find('span.text-primary');
                const tanggal_masuk = tglSpans.length > 1 ? $(tglSpans[1]).text().trim() : $(tglSpans[0]).text().trim();

                if (nama_pasien && nama_pasien !== '') {
                    jadwalRanap.push({ ruangan, no_kamar, no_rm, nama_pasien, tanggal_lahir, usia, dpjp_utama, dokter_rawat_bersama, tanggal_masuk, lama_rawat });
                }
            }
        });

        // 5. Logika Filter Manual
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
            filteredData = filteredData.filter(item => 
                item.tanggal_masuk.includes(formatIndoSearch)
            );
        }

        // 6. Kembalikan Response
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
