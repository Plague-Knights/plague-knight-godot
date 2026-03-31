// Simple static server for Godot web export
// Serves build/web/ with correct headers for WASM
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const PORT = parseInt(process.env.PORT || "8080");
const DIR = join(import.meta.dirname, "..", "build", "web");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".wasm": "application/wasm",
  ".pck": "application/octet-stream",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  let path = req.url === "/" ? "/index.html" : req.url;
  const file = join(DIR, path);

  try {
    const data = await readFile(file);
    const ext = extname(path);
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(PORT, () => console.log(`Game server on port ${PORT}`));
