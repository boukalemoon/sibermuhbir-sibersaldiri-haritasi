// api/public-stats.js
// Herkese açık haftalık ülke bazlı saldırı istatistikleri (heatmap için)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 dakika cache

  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Supabase yoksa boş yanıt dön (hata verme)
    return res.status(200).json({ countries: [], top_types: [], total: 0 });
  }

  try {
    const [countryResp, typeResp] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/get_country_stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ hours_back: 168 }), // 7 gün
      }),
      fetch(`${SUPABASE_URL}/rest/v1/rpc/get_attack_type_stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ hours_back: 168 }),
      }),
    ]);

    const [countries, types] = await Promise.all([
      countryResp.json(),
      typeResp.json(),
    ]);

    const countryList = Array.isArray(countries) ? countries : [];
    const total = countryList.reduce((s, c) => s + Number(c.total || 0), 0);

    return res.status(200).json({
      countries: countryList.map(c => ({
        country: c.country,
        as_source: Number(c.as_source || 0),
        as_target: Number(c.as_target || 0),
        total: Number(c.total || 0),
      })),
      top_types: Array.isArray(types) ? types.slice(0, 10) : [],
      total,
      period: 'weekly',
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('public-stats error:', e);
    return res.status(200).json({ countries: [], top_types: [], total: 0 });
  }
}
