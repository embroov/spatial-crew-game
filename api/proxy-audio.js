export default async function handler(req, res) {
  const urlParam = req.query.url;
  if (!urlParam) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const match = String(urlParam).match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || String(urlParam).match(/id=([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : '';
    const targetUrl = fileId
      ? `https://docs.google.com/uc?export=download&id=${fileId}`
      : String(urlParam);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch audio from Google Drive');
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Vercel audio proxy error:', err);
    return res.status(500).send('Proxy error');
  }
}
