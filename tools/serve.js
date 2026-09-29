// Servidor estático mínimo (sin dependencias) para la vista previa y la exportación.
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = { ".svg": "image/svg+xml", ".webp": "image/webp", '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.json': 'application/json' };

function serve(root, port = 0) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.normalize(path.join(root, url.endsWith('/') ? url + 'index.html' : url));
    if (!file.startsWith(path.normalize(root))) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('No encontrado'); }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const range = req.headers.range;
      if (range) {
        const [a, b] = range.replace('bytes=', '').split('-');
        const start = parseInt(a, 10), end = b ? parseInt(b, 10) : st.size - 1;
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
        return fs.createReadStream(file, { start, end }).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
module.exports = { serve };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const port = parseInt(process.env.PORT || '8080', 10);
  serve(root, port).then((s) => {
    const u = `http://127.0.0.1:${s.address().port}`;
    console.log(`Reel v1: ${u}/reel/`);
    for (const d of fs.existsSync(path.join(root, 'versiones')) ? fs.readdirSync(path.join(root, 'versiones')) : []) if (!d.startsWith('_')) console.log(`Versión ${d}: ${u}/versiones/${d}/`);
  });
}
