import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function audioProxyPlugin(): Plugin {
  return {
    name: 'audio-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy-audio', async (req, res) => {
        const urlParam = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`).searchParams.get('url');
        if (!urlParam) {
          res.statusCode = 400;
          res.end('Missing url');
          return;
        }

        try {
          const match = urlParam.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || urlParam.match(/id=([a-zA-Z0-9_-]+)/);
          const fileId = match ? match[1] : '';
          const targetUrl = fileId
            ? `https://docs.google.com/uc?export=download&id=${fileId}`
            : urlParam;

          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (!response.ok) {
            res.statusCode = response.status;
            res.end('Failed to fetch audio from Google Drive');
            return;
          }

          res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=3600');

          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (err) {
          console.error('Vite audio proxy error:', err);
          res.statusCode = 500;
          res.end('Proxy error');
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    audioProxyPlugin()
  ],
  server: {
    port: 5173,
    host: true
  }
})
