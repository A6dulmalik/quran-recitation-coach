// Minimal static file server for the exported site in ./out (local preview and
// end-to-end tests). Production hosting should use a real static host/CDN.
// Usage: node scripts/serve-static.mjs [port]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../out", import.meta.url)));
const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const target = normalize(join(root, decoded));
  if (target !== root && !target.startsWith(root + sep)) return null; // path traversal
  // Next 16 exports segment prefetch files as "__next.<seg>/__PAGE__.txt" but the
  // client requests "__next.<seg>.__PAGE__.txt"; map one to the other.
  const segment = target.replace(/\.(__[A-Z_]+__\.txt)$/, `${sep}$1`);
  for (const candidate of [target, `${target}.html`, join(target, "index.html"), segment]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

if (!existsSync(root)) {
  console.error(`No export found at ${root}. Run "npm run build" first.`);
  process.exit(1);
}

createServer((req, res) => {
  let file = null;
  try {
    file = resolveFile(req.url ?? "/");
  } catch {
    // malformed URL encoding
  }
  const status = file ? 200 : 404;
  file ??= join(root, "404.html");
  res.writeHead(status, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": file.includes(`${sep}_next${sep}static${sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
