// api/aggregate.js
// Vercel cron job: Her gece 01:00 UTC'de çalışır.
// Dünkü attack_logs'u country_daily_stats tablosuna özetler.
// Ayrıca admin tarafından manuel tetiklenebilir: GET /api/aggregate?key=ADMIN_KEY&date=2026-05-13
export default async function handler(req, res) {
  // Vercel cron otomatik olarak CRON_SECRET ile çağırır
  // Admin da ADMIN_API_KEY ile manuel tetikleyebilir
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.ADMIN_API_KEY;
  const authHeader = req.headers['authorization'];
  const queryKey = req.query.key;

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = adminKey && queryKey === adminKey;

  if (!isVercelCron && !isAdmin) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase config eksik' });
  }

  // Hangi tarihi aggregate edeceğimizi belirle
  let targetDate = req.query.date; // Manuel: ?date=2026-05-13
  if (!targetDate) {
    // Varsayılan: dün
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = yesterday.toISOString().split('T')[0];
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/aggregate_daily_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ target_date: targetDate }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Aggregate error:', err);
      return res.status(500).json({ error: 'Aggregation hatası', detail: err });
    }

    const result = await resp.json();
    console.log(`[aggregate] ${targetDate} tamamlandı`);
    return res.status(200).json({
      success: true,
      aggregated_date: targetDate,
      result,
    });
  } catch (e) {
    console.error('aggregate error:', e);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
