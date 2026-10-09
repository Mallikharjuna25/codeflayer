export default async function handler(req, res) {
  // 1. Verify Authorization header against CRON_SECRET if configured
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {
    ok: true,
    timestamp: new Date().toISOString(),
    backendPinged: false,
  };

  // 2. Optional: Keep backend alive if URL is provided
  const backendUrl = process.env.BACKEND_API_URL || process.env.VITE_API_URL;
  if (backendUrl) {
    try {
      const cleanUrl = backendUrl.replace(/\/+$/, '');
      const backendRes = await fetch(`${cleanUrl}/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Vercel-Cron-KeepAlive',
        },
      });
      results.backendPinged = backendRes.ok;
      results.backendStatus = backendRes.status;
    } catch (err) {
      results.backendPinged = false;
      results.backendError = err.message;
    }
  }

  return res.status(200).json(results);
}
