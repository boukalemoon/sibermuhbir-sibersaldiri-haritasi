// api/threats.js
export default async function handler(req, res) {
    // OTX API anahtarınızı buraya yazın (https://otx.alienvault.com settings -> API Key)
    const OTX_API_KEY = a2878f3db1c3f6919209c0033dcb7f06fc60bb18c9bfa33abc8fbc9886854995;   // <--- Bunu kendi anahtarınızla değiştirin

    // Son 1 saatteki popüler tehditleri al
    const url = 'https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20&modified_since=3600';

    try {
        const response = await fetch(url, {
            headers: { 'X-OTX-API-KEY': OTX_API_KEY }
        });
        const data = await response.json();

        // OTX'ten gelen verileri haritada gösterebileceğimiz formata dönüştür
        const attacks = [];
        for (const pulse of data.results || []) {
            // Her pulse içinde indicators (IP, domain, URL) var
            for (const indicator of pulse.indicators || []) {
                if (indicator.type === 'IPv4') {
                    // IP'nin coğrafi konumunu bulmak için ayrı bir istek atmak gerek.
                    // Karmaşıklığı azaltmak için örnek olarak rastgele ülke atayalım.
                    // İleride ipinfo.io ile geliştirebilirsiniz.
                    const randomCountry = getRandomCountry();
                    attacks.push({
                        id: indicator.id,
                        timestamp: new Date().getTime(),
                        sourceCountry: randomCountry.name,
                        sourceCode: randomCountry.code,
                        sourceLat: randomCountry.lat,
                        sourceLng: randomCountry.lng,
                        targetCountry: 'Target',
                        targetCode: 'XX',
                        targetLat: 0,
                        targetLng: 0,
                        type: pulse.name || 'Threat',
                        color: '#ff4444',
                        port: 80,
                        ip: indicator.indicator
                    });
                }
            }
        }
        res.status(200).json(attacks.slice(0, 30)); // En fazla 30 saldırı
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Veri alınamadı' });
    }
}

// Yardımcı fonksiyon: Rastgele ülke (threat.service.ts'deki COUNTRIES listesini kopyaladık)
const COUNTRIES = [
    { code: 'US', name: 'United States', lat: 38, lng: -97, weight: 100 },
    { code: 'RU', name: 'Russia', lat: 60, lng: 100, weight: 70 },
    { code: 'CN', name: 'China', lat: 35, lng: 105, weight: 80 },
    { code: 'TR', name: 'Turkey', lat: 39, lng: 35, weight: 30 },
    // diğer ülkeleri de ekleyebilirsiniz (threat.service.ts'den alın)
];
function getRandomCountry() {
    const total = COUNTRIES.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    for (const c of COUNTRIES) {
        if (r < c.weight) return c;
        r -= c.weight;
    }
    return COUNTRIES[0];
}