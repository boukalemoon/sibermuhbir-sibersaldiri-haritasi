// api/analytics.js
// Ziyaretçi olaylarını Supabase'e kaydeder
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(200).end();

  const { type, sessionId, payload } = req.body || {};
  if (!type || !sessionId) return res.status(400).json({ error: 'Eksik alan' });

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: 'return=minimal',
  };

  try {
    if (type === 'session_start') {
      // Yeni oturum oluştur
      await fetch(`${SUPABASE_URL}/rest/v1/analytics_sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: sessionId,
          device_type: payload?.deviceType || 'unknown',
          referrer: payload?.referrer?.slice(0, 200) || null,
          country_code: payload?.countryCode || null,
        }),
      });
    } else if (type === 'session_end') {
      // Oturumu güncelle
      await fetch(
        `${SUPABASE_URL}/rest/v1/analytics_sessions?id=eq.${encodeURIComponent(sessionId)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            last_active_at: new Date().toISOString(),
            duration_seconds: Math.min(payload?.duration || 0, 86400),
          }),
        }
      );
    } else {
      // Genel olay (country_click, news_open, map_toggle...)
      await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          event_type: type,
          properties: payload || {},
        }),
      });
    }

    // Fırsatçı temizlik (%2 olasılıkla 90 günden eski veriyi sil)
    if (Math.random() < 0.02) {
      fetch(`${SUPABASE_URL}/rest/v1/rpc/cleanup_old_analytics`, {
        method: 'POST',
        headers,
        body: '{}',
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('analytics error:', e);
    return res.status(200).end(); // analytics hatası sessizce geçilir
  }
}
