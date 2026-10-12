// static server with gzip, like GitHub Pages, for honest local measurements
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const root = process.argv[2], port = Number(process.argv[3]);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".mp4": "video/mp4", ".json": "application/json", ".xml": "application/xml", ".png": "image/png", ".jpg": "image/jpeg" };
http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f), body = fs.readFileSync(f);
  const gz = /html|js|css|svg|json|xml/.test(ext) && /gzip/.test(req.headers["accept-encoding"] || "");
  res.writeHead(200, { "content-type": types[ext] || "application/octet-stream", ...(gz ? { "content-encoding": "gzip" } : {}) });
  res.end(gz ? zlib.gzipSync(body) : body);
}).listen(port);
