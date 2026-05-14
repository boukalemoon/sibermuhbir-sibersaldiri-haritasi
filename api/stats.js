// api/stats.js
// Admin istatistik endpoint'i — AI asistan entegrasyonu için
// Kullanım: GET /api/stats?key=ADMIN_KEY&period=daily|weekly|monthly
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Admin key kontrolü (query param veya header)
  const ADMIN_KEY = process.env.ADMIN_API_KEY;
  const providedKey = req.query.key || req.headers['x-admin-key'];
  if (!ADMIN_KEY || providedKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const period = req.query.period || 'weekly';
  // historical=30|60|90|365 ise country_daily_stats'tan okur (uzun dönem)
  const historical = parseInt(req.query.historical || '0', 10);
  const hoursMap = { daily: 24, weekly: 168, monthly: 720 };
  const hours = hoursMap[period] || 168;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  try {
    // Uzun dönem tarihsel veri (30-365 gün) — country_daily_stats tablosundan
    if (historical > 0) {
      const [histResp, dailyTotalsResp] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/rpc/get_historical_country_stats`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ days_back: historical }),
        }),
        fetch(`${SUPABASE_URL}/rest/v1/rpc/get_daily_totals`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ days_back: historical }),
        }),
      ]);
      const [histData, dailyTotals] = await Promise.all([histResp.json(), dailyTotalsResp.json()]);
      const countries = Array.isArray(histData) ? histData : [];
      return res.status(200).json({
        generated_at: new Date().toISOString(),
        period: `historical_${historical}d`,
        days_back: historical,
        top_targeted_countries: countries.sort((a, b) => b.total_as_target - a.total_as_target).slice(0, 20),
        top_source_countries: countries.sort((a, b) => b.total_as_source - a.total_as_source).slice(0, 20),
        daily_totals: Array.isArray(dailyTotals) ? dailyTotals : [],
        total_attacks: countries.reduce((s, c) => s + Number(c.grand_total || 0), 0) / 2,
        _description: `Siber Muhbir Attack Map — Son ${historical} günün tarihsel istatistikleri (country_daily_stats)`,
      });
    }

    const [summaryResp, countryResp, typeResp, hourlyResp] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/get_summary_stats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ hours_back: hours }),
      }),
      fetch(`${SUPABASE_URL}/rest/v1/rpc/get_country_stats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ hours_back: hours }),
      }),
      fetch(`${SUPABASE_URL}/rest/v1/rpc/get_attack_type_stats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ hours_back: hours }),
      }),
      fetch(`${SUPABASE_URL}/rest/v1/rpc/get_hourly_trend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ hours_back: Math.min(hours, 72) }),
      }),
    ]);

    const [summary, countries, types, hourly] = await Promise.all([
      summaryResp.json(),
      countryResp.json(),
      typeResp.json(),
      hourlyResp.json(),
    ]);

    const topTargeted = Array.isArray(countries)
      ? countries.sort((a, b) => b.as_target - a.as_target).slice(0, 20)
      : [];
    const topSources = Array.isArray(countries)
      ? countries.sort((a, b) => b.as_source - a.as_source).slice(0, 20)
      : [];

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      period,
      hours_back: hours,
      summary: summary || {},
      top_targeted_countries: topTargeted,
      top_source_countries: topSources,
      top_attack_types: Array.isArray(types) ? types : [],
      hourly_trend: Array.isArray(hourly) ? hourly : [],
      // AI asistan için açıklama
      _description: `Siber Muhbir Attack Map — Son ${hours} saatin saldırı istatistikleri`,
    });
  } catch (e) {
    console.error('stats error:', e);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
