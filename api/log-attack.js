// api/log-attack.js
// Saldırı loglarını Supabase'e kaydeder (Vercel serverless)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase config eksik' });
  }

  const attacks = req.body;
  if (!Array.isArray(attacks) || attacks.length === 0) {
    return res.status(400).json({ error: 'Geçersiz veri' });
  }

  const rows = attacks.map(a => ({
    source_country: a.sourceCountry || '',
    target_country: a.targetCountry || '',
    attack_type: a.type || 'Bilinmiyor',
    source_lat: a.sourceLat || null,
    source_lng: a.sourceLng || null,
    target_lat: a.targetLat || null,
    target_lng: a.targetLng || null,
  })).filter(r => r.source_country && r.target_country);

  if (rows.length === 0) return res.status(400).json({ error: 'Geçerli satır yok' });

  try {
    // Insert batch
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/attack_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(rows),
    });

    if (!insertResp.ok) {
      const err = await insertResp.text();
      console.error('Supabase insert error:', err);
      return res.status(500).json({ error: 'DB insert hatası' });
    }

    // 7 günden eski verileri temizle (fırsatçı cleanup, %10 olasılıkla)
    if (Math.random() < 0.1) {
      await fetch(`${SUPABASE_URL}/rest/v1/attack_logs?created_at=lt.${new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
    }

    return res.status(200).json({ logged: rows.length });
  } catch (e) {
    console.error('log-attack error:', e);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
