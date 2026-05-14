// api/threats.js
// Gerçek tehdit zekası: AlienVault OTX → IPinfo (coğrafya) → AbuseIPDB (skor)
// Vercel serverless — her 30 saniyede frontend tarafından çağrılır

// ── Modül düzeyi OTX cache (warm instance boyunca yaşar, ~5 dk TTL) ──
let _otxCache = { raw: [], fetchedAt: 0 };
const OTX_CACHE_MS = 5 * 60 * 1000;

// ── Ülke verisi: ISO kodu → Türkçe ad + merkez koordinat ──
const COUNTRY_DATA = {
  AD: { name: 'Andorra',                     lat: 42.5,  lng: 1.5   },
  AE: { name: 'Birleşik Arap Emirlikleri',   lat: 24,    lng: 54    },
  AF: { name: 'Afganistan',                  lat: 33,    lng: 65    },
  AL: { name: 'Arnavutluk',                  lat: 41,    lng: 20    },
  AM: { name: 'Ermenistan',                  lat: 40,    lng: 45    },
  AO: { name: 'Angola',                      lat: -11,   lng: 18    },
  AR: { name: 'Arjantin',                    lat: -34,   lng: -64   },
  AT: { name: 'Avusturya',                   lat: 47,    lng: 13    },
  AU: { name: 'Avustralya',                  lat: -25,   lng: 133   },
  AZ: { name: 'Azerbaycan',                  lat: 40,    lng: 47    },
  BA: { name: 'Bosna Hersek',                lat: 44,    lng: 17    },
  BD: { name: 'Bangladeş',                   lat: 24,    lng: 90    },
  BE: { name: 'Belçika',                     lat: 50,    lng: 4     },
  BF: { name: 'Burkina Faso',                lat: 13,    lng: -2    },
  BG: { name: 'Bulgaristan',                 lat: 43,    lng: 25    },
  BH: { name: 'Bahreyn',                     lat: 26,    lng: 50    },
  BJ: { name: 'Benin',                       lat: 10,    lng: 2     },
  BN: { name: 'Brunei',                      lat: 4.5,   lng: 114.7 },
  BO: { name: 'Bolivya',                     lat: -17,   lng: -65   },
  BR: { name: 'Brezilya',                    lat: -10,   lng: -55   },
  BY: { name: 'Belarus',                     lat: 53,    lng: 28    },
  CA: { name: 'Kanada',                      lat: 60,    lng: -95   },
  CD: { name: 'Kongo DRC',                   lat: -4,    lng: 24    },
  CF: { name: 'Orta Afrika Cum.',            lat: 7,     lng: 21    },
  CG: { name: 'Kongo',                       lat: -1,    lng: 15    },
  CH: { name: 'İsviçre',                     lat: 47,    lng: 8     },
  CI: { name: 'Fildişi Sahili',             lat: 8,     lng: -5    },
  CL: { name: 'Şili',                        lat: -35,   lng: -71   },
  CM: { name: 'Kamerun',                     lat: 4,     lng: 12    },
  CN: { name: 'Çin',                         lat: 35,    lng: 105   },
  CO: { name: 'Kolombiya',                   lat: 4,     lng: -72   },
  CU: { name: 'Küba',                        lat: 22,    lng: -80   },
  CY: { name: 'Kıbrıs',                      lat: 35,    lng: 33    },
  CZ: { name: 'Çekya',                       lat: 50,    lng: 15    },
  DE: { name: 'Almanya',                     lat: 51,    lng: 9     },
  DJ: { name: 'Cibuti',                      lat: 12,    lng: 43    },
  DK: { name: 'Danimarka',                   lat: 56,    lng: 10    },
  DZ: { name: 'Cezayir',                     lat: 28,    lng: 2     },
  EC: { name: 'Ekvador',                     lat: -2,    lng: -77   },
  EE: { name: 'Estonya',                     lat: 59,    lng: 25    },
  EG: { name: 'Mısır',                       lat: 26,    lng: 30    },
  ER: { name: 'Eritre',                      lat: 15,    lng: 39    },
  ES: { name: 'İspanya',                     lat: 40,    lng: -4    },
  ET: { name: 'Etiyopya',                    lat: 9,     lng: 40    },
  FI: { name: 'Finlandiya',                  lat: 64,    lng: 26    },
  FR: { name: 'Fransa',                      lat: 46,    lng: 2     },
  GA: { name: 'Gabon',                       lat: -1,    lng: 12    },
  GB: { name: 'Birleşik Krallık',            lat: 55,    lng: -3    },
  GE: { name: 'Gürcistan',                   lat: 42,    lng: 43    },
  GH: { name: 'Gana',                        lat: 8,     lng: -1    },
  GN: { name: 'Gine',                        lat: 11,    lng: -11   },
  GR: { name: 'Yunanistan',                  lat: 39,    lng: 22    },
  GT: { name: 'Guatemala',                   lat: 15,    lng: -90   },
  HN: { name: 'Honduras',                    lat: 15,    lng: -87   },
  HR: { name: 'Hırvatistan',                 lat: 45,    lng: 15    },
  HU: { name: 'Macaristan',                  lat: 47,    lng: 20    },
  ID: { name: 'Endonezya',                   lat: -5,    lng: 120   },
  IE: { name: 'İrlanda',                     lat: 53,    lng: -8    },
  IL: { name: 'İsrail',                      lat: 31,    lng: 34    },
  IN: { name: 'Hindistan',                   lat: 20,    lng: 77    },
  IQ: { name: 'Irak',                        lat: 33,    lng: 44    },
  IR: { name: 'İran',                        lat: 32,    lng: 53    },
  IS: { name: 'İzlanda',                     lat: 64,    lng: -19   },
  IT: { name: 'İtalya',                      lat: 42,    lng: 12    },
  JO: { name: 'Ürdün',                       lat: 31,    lng: 36    },
  JP: { name: 'Japonya',                     lat: 36,    lng: 138   },
  KE: { name: 'Kenya',                       lat: -1,    lng: 37    },
  KH: { name: 'Kamboçya',                    lat: 12,    lng: 105   },
  KP: { name: 'Kuzey Kore',                  lat: 40,    lng: 127   },
  KR: { name: 'Güney Kore',                  lat: 36,    lng: 128   },
  KW: { name: 'Kuveyt',                      lat: 29,    lng: 48    },
  KZ: { name: 'Kazakistan',                  lat: 48,    lng: 68    },
  LB: { name: 'Lübnan',                      lat: 34,    lng: 36    },
  LK: { name: 'Sri Lanka',                   lat: 7,     lng: 81    },
  LT: { name: 'Litvanya',                    lat: 56,    lng: 24    },
  LU: { name: 'Lüksemburg',                  lat: 49.8,  lng: 6.1   },
  LV: { name: 'Letonya',                     lat: 57,    lng: 25    },
  LY: { name: 'Libya',                       lat: 26,    lng: 17    },
  MA: { name: 'Fas',                         lat: 32,    lng: -5    },
  MD: { name: 'Moldova',                     lat: 47,    lng: 29    },
  ME: { name: 'Karadağ',                     lat: 43,    lng: 19    },
  MG: { name: 'Madagaskar',                  lat: -20,   lng: 47    },
  ML: { name: 'Mali',                        lat: 17,    lng: -4    },
  MM: { name: 'Myanmar',                     lat: 17,    lng: 96    },
  MN: { name: 'Moğolistan',                  lat: 46,    lng: 105   },
  MR: { name: 'Moritanya',                   lat: 20,    lng: -12   },
  MX: { name: 'Meksika',                     lat: 23,    lng: -102  },
  MY: { name: 'Malezya',                     lat: 4,     lng: 109   },
  MZ: { name: 'Mozambik',                    lat: -18,   lng: 35    },
  NA: { name: 'Namibya',                     lat: -22,   lng: 17    },
  NC: { name: 'Yeni Kaledonya',              lat: -21,   lng: 165   },
  NE: { name: 'Nijer',                       lat: 17,    lng: 8     },
  NG: { name: 'Nijerya',                     lat: 10,    lng: 8     },
  NL: { name: 'Hollanda',                    lat: 52,    lng: 5     },
  NO: { name: 'Norveç',                      lat: 62,    lng: 10    },
  NP: { name: 'Nepal',                       lat: 28,    lng: 84    },
  NZ: { name: 'Yeni Zelanda',                lat: -40,   lng: 174   },
  OM: { name: 'Umman',                       lat: 21,    lng: 57    },
  PA: { name: 'Panama',                      lat: 8,     lng: -80   },
  PE: { name: 'Peru',                        lat: -10,   lng: -76   },
  PG: { name: 'Papua Yeni Gine',             lat: -6,    lng: 147   },
  PH: { name: 'Filipinler',                  lat: 13,    lng: 122   },
  PK: { name: 'Pakistan',                    lat: 30,    lng: 70    },
  PL: { name: 'Polonya',                     lat: 52,    lng: 20    },
  PS: { name: 'Filistin',                    lat: 31.9,  lng: 35.2  },
  PT: { name: 'Portekiz',                    lat: 39,    lng: -8    },
  QA: { name: 'Katar',                       lat: 25,    lng: 51    },
  RO: { name: 'Romanya',                     lat: 46,    lng: 25    },
  RS: { name: 'Sırbistan',                   lat: 44,    lng: 21    },
  RU: { name: 'Rusya',                       lat: 60,    lng: 100   },
  SA: { name: 'Suudi Arabistan',             lat: 25,    lng: 45    },
  SE: { name: 'İsveç',                       lat: 60,    lng: 15    },
  SG: { name: 'Singapur',                    lat: 1.3,   lng: 103.8 },
  SK: { name: 'Slovakya',                    lat: 48,    lng: 19    },
  SL: { name: 'Sierra Leone',                lat: 8.5,   lng: -11.5 },
  SN: { name: 'Senegal',                     lat: 14,    lng: -14   },
  SO: { name: 'Somali',                      lat: 6,     lng: 46    },
  SY: { name: 'Suriye',                      lat: 35,    lng: 38    },
  TD: { name: 'Çad',                         lat: 15,    lng: 19    },
  TH: { name: 'Tayland',                     lat: 15,    lng: 100   },
  TJ: { name: 'Tacikistan',                  lat: 39,    lng: 71    },
  TN: { name: 'Tunus',                       lat: 34,    lng: 9     },
  TR: { name: 'Türkiye',                     lat: 39,    lng: 35    },
  TW: { name: 'Tayvan',                      lat: 23.5,  lng: 121   },
  TZ: { name: 'Tanzanya',                    lat: -6,    lng: 35    },
  UA: { name: 'Ukrayna',                     lat: 48,    lng: 31    },
  UG: { name: 'Uganda',                      lat: 1,     lng: 32    },
  US: { name: 'Amerika Birleşik Devletleri', lat: 38,    lng: -97   },
  UZ: { name: 'Özbekistan',                  lat: 41,    lng: 64    },
  VE: { name: 'Venezuela',                   lat: 8,     lng: -66   },
  VN: { name: 'Vietnam',                     lat: 14,    lng: 108   },
  YE: { name: 'Yemen',                       lat: 15,    lng: 48    },
  ZA: { name: 'Güney Afrika',                lat: -30,   lng: 25    },
  ZM: { name: 'Zambiya',                     lat: -14,   lng: 26    },
  ZW: { name: 'Zimbabve',                    lat: -20,   lng: 30    },
};

// Ağırlıklı hedef ülke listesi (Türkiye ağırlığı yüksek — yerel odak)
const TARGET_WEIGHTS = [
  { code: 'US', w: 100 }, { code: 'DE', w: 60 }, { code: 'GB', w: 60 },
  { code: 'TR', w: 80  }, { code: 'FR', w: 50 }, { code: 'IN', w: 55 },
  { code: 'JP', w: 40  }, { code: 'AU', w: 35 }, { code: 'CA', w: 45 },
  { code: 'NL', w: 45  }, { code: 'KR', w: 40 }, { code: 'BR', w: 45 },
  { code: 'IL', w: 35  }, { code: 'UA', w: 40 }, { code: 'IT', w: 30 },
  { code: 'ES', w: 30  }, { code: 'SG', w: 38 }, { code: 'SE', w: 20 },
  { code: 'PL', w: 22  }, { code: 'CH', w: 20 },
];
const TARGET_TOTAL = TARGET_WEIGHTS.reduce((s, c) => s + c.w, 0);

function getWeightedTarget(excludeCode) {
  let r = Math.random() * TARGET_TOTAL;
  for (const c of TARGET_WEIGHTS) {
    if (c.code !== excludeCode && r < c.w) return { code: c.code, ...COUNTRY_DATA[c.code] };
    r -= c.w;
  }
  const fallback = TARGET_WEIGHTS.find(c => c.code !== excludeCode);
  return fallback ? { code: fallback.code, ...COUNTRY_DATA[fallback.code] } : null;
}

// OTX tag → saldırı tipi eşlemesi
const TAG_TYPE_MAP = {
  'ddos': { name: 'DDoS', color: '#ff3333', port: 80 },
  'ransomware': { name: 'Ransomware', color: '#ff9933', port: 445 },
  'phishing': { name: 'Phishing', color: '#ffff33', port: 25 },
  'botnet': { name: 'Botnet', color: '#33ffff', port: 8080 },
  'malware': { name: 'Malware', color: '#ff33ff', port: 443 },
  'exploit': { name: 'Exploit', color: '#ff3399', port: 80 },
  'bruteforce': { name: 'SSH Brute Force', color: '#3333ff', port: 22 },
  'brute-force': { name: 'SSH Brute Force', color: '#3333ff', port: 22 },
  'sql': { name: 'SQL Injection', color: '#33ff33', port: 3306 },
  'injection': { name: 'SQL Injection', color: '#33ff33', port: 3306 },
  'scan': { name: 'Scan', color: '#99ff33', port: 0 },
  'apt': { name: 'APT', color: '#ff6600', port: 443 },
  'cryptomining': { name: 'Cryptomining', color: '#00ccff', port: 3333 },
  'trojan': { name: 'Malware', color: '#ff33ff', port: 443 },
};
const DEFAULT_TYPE = { name: 'Malware', color: '#ff33ff', port: 443 };

function guessAttackType(pulse) {
  const tags = (pulse.tags || []).map(t => t.toLowerCase());
  for (const tag of tags) {
    for (const [key, val] of Object.entries(TAG_TYPE_MAP)) {
      if (tag.includes(key)) return val;
    }
  }
  const name = (pulse.name || '').toLowerCase();
  for (const [key, val] of Object.entries(TAG_TYPE_MAP)) {
    if (name.includes(key)) return val;
  }
  return DEFAULT_TYPE;
}

// ── OTX veri çekme ──
async function fetchOTXData(apiKey) {
  if (Date.now() - _otxCache.fetchedAt < OTX_CACHE_MS) return _otxCache.raw;

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const url = `https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20&modified_since=${encodeURIComponent(since)}`;

  const resp = await fetch(url, {
    headers: { 'X-OTX-API-KEY': apiKey },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) return [];
  const data = await resp.json();

  const raw = [];
  for (const pulse of (data.results || [])) {
    const typeInfo = guessAttackType(pulse);
    const targetCodes = (pulse.targeted_countries || []).filter(c => COUNTRY_DATA[c]);
    const ipIndicators = (pulse.indicators || [])
      .filter(i => i.type === 'IPv4')
      .slice(0, 15);

    for (const ind of ipIndicators) {
      raw.push({ ip: ind.indicator, pulse, typeInfo, targetCodes });
    }
  }

  _otxCache = { raw, fetchedAt: Date.now() };
  return raw;
}

// ── Supabase cache sorgusu ──
async function lookupGeoCache(ips, supabaseUrl, anonKey) {
  if (!supabaseUrl || !anonKey || !ips.length) return {};
  const ipList = ips.map(ip => `"${ip}"`).join(',');
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/ip_geo_cache?ip=in.(${ipList})&cached_at=gt.${since}&select=ip,country_code,lat,lng,abuse_score,is_bogon`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
    );
    if (!resp.ok) return {};
    const rows = await resp.json();
    const map = {};
    for (const r of rows) map[r.ip] = r;
    return map;
  } catch { return {}; }
}

// ── Supabase cache yazma ──
async function saveGeoCache(rows, supabaseUrl, anonKey) {
  if (!supabaseUrl || !anonKey || !rows.length) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/ip_geo_cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(rows),
    });
  } catch { /* sessiz hata */ }
}

// ── IPinfo sorgusu ──
async function geolocateIP(ip, token) {
  const url = token ? `https://ipinfo.io/${ip}?token=${token}` : `https://ipinfo.io/${ip}/json`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return null;
    const d = await resp.json();
    if (d.bogon || !d.country) return { is_bogon: true };
    const [lat, lng] = (d.loc || '0,0').split(',').map(Number);
    if (!lat && !lng) return null;
    return {
      ip,
      country_code: d.country,
      country_name: COUNTRY_DATA[d.country]?.name || d.country,
      lat,
      lng,
      city: d.city || null,
      org: d.org || null,
      is_bogon: false,
      cached_at: new Date().toISOString(),
    };
  } catch { return null; }
}

// ── AbuseIPDB sorgusu ──
async function checkAbuseIPDB(ip, apiKey) {
  try {
    const resp = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`,
      {
        headers: { Key: apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!resp.ok) return null;
    const d = await resp.json();
    return d.data?.abuseConfidenceScore ?? null;
  } catch { return null; }
}

// ── Ana handler ──
export default async function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const OTX_API_KEY = process.env.OTX_API_KEY;
  const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
  const ABUSEIPDB_KEY = process.env.ABUSEIPDB_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    // OTX verisi yoksa → frontend simülasyona düşer
    if (!OTX_API_KEY) return res.status(200).json([]);

    const otxRaw = await fetchOTXData(OTX_API_KEY);
    if (!otxRaw.length) return res.status(200).json([]);

    // Benzersiz IP listesi (max 40)
    const uniqueIPs = [...new Set(otxRaw.map(a => a.ip))].slice(0, 40);

    // Supabase cache'den toplu sorgula
    const geoMap = await lookupGeoCache(uniqueIPs, SUPABASE_URL, SUPABASE_ANON_KEY);

    // Cache'de olmayan IP'leri IPinfo ile sorgula (max 12/istek)
    const uncached = uniqueIPs.filter(ip => !geoMap[ip]).slice(0, 12);
    const newGeoRows = [];
    for (const ip of uncached) {
      const geo = await geolocateIP(ip, IPINFO_TOKEN);
      if (geo) {
        geoMap[ip] = geo;
        if (!geo.is_bogon) newGeoRows.push(geo);
      }
    }

    // AbuseIPDB: cache'siz IP'lerin ilk 4'ünü kontrol et (kota tasarrufu)
    if (ABUSEIPDB_KEY) {
      const toCheck = uncached.filter(ip => geoMap[ip] && !geoMap[ip].is_bogon).slice(0, 4);
      for (const ip of toCheck) {
        const score = await checkAbuseIPDB(ip, ABUSEIPDB_KEY);
        if (score !== null) {
          geoMap[ip].abuse_score = score;
          const row = newGeoRows.find(r => r.ip === ip);
          if (row) row.abuse_score = score;
        }
      }
    }

    // Yeni geo verilerini cache'e yaz
    if (newGeoRows.length) {
      await saveGeoCache(newGeoRows, SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // Attack objelerini oluştur
    const attacks = [];
    const seen = new Set();

    for (const { ip, pulse, typeInfo, targetCodes } of otxRaw) {
      if (seen.has(ip)) continue; // aynı IP'yi bir kez göster
      seen.add(ip);

      const geo = geoMap[ip];
      if (!geo || geo.is_bogon || !geo.country_code) continue;
      if (!COUNTRY_DATA[geo.country_code]) continue;

      const srcCountry = COUNTRY_DATA[geo.country_code];
      const jitter = () => (Math.random() * 3 - 1.5);

      // Hedef ülke: OTX'ten geldiyse gerçek, yoksa ağırlıklı rastgele
      let tgt = null;
      if (targetCodes.length > 0) {
        const code = targetCodes[Math.floor(Math.random() * targetCodes.length)];
        if (code !== geo.country_code) tgt = { code, ...COUNTRY_DATA[code] };
      }
      if (!tgt) tgt = getWeightedTarget(geo.country_code);
      if (!tgt) continue;

      attacks.push({
        id: `otx-${ip.replace(/\./g, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: Date.now(),
        sourceCountry: srcCountry.name,
        sourceCode: geo.country_code,
        sourceLat: (geo.lat || srcCountry.lat) + jitter(),
        sourceLng: (geo.lng || srcCountry.lng) + jitter(),
        targetCountry: tgt.name,
        targetCode: tgt.code,
        targetLat: tgt.lat + jitter(),
        targetLng: tgt.lng + jitter(),
        type: typeInfo.name,
        color: typeInfo.color,
        port: typeInfo.port,
        ip,
        abuseScore: geo.abuse_score ?? -1,
        adversary: pulse.adversary || null,
        source: 'OTX', // gerçek veri işareti
      });

      if (attacks.length >= 30) break;
    }

    return res.status(200).json(attacks);
  } catch (e) {
    console.error('[threats] error:', e.message);
    return res.status(200).json([]); // hata → frontend simülasyona düşer
  }
}
