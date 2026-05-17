import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(.:)/, "$1");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 5173);

function readGeminiKey() {
  const envPath = path.join(root, ".env");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    const match = raw.match(/^GEMINI_API_KEY=(.+)$/m);
    if (match && match[1].trim() && !match[1].includes("BURAYA")) return match[1].trim();
  }
  const desktopJarvisConfig = path.join(path.dirname(root), "jarvis", "config", "api_keys.json");
  if (fs.existsSync(desktopJarvisConfig)) {
    try {
      const config = JSON.parse(fs.readFileSync(desktopJarvisConfig, "utf8"));
      if (config.gemini_api_key) return String(config.gemini_api_key).trim();
    } catch {}
  }
  return "";
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Istek cok buyuk."));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleChat(req, res) {
  try {
    const apiKey = readGeminiKey();
    if (!apiKey) return sendJson(res, 500, { error: "Gemini API key bulunamadi. .env ya da jarvis/config/api_keys.json kontrol et." });

    const payload = JSON.parse(await readBody(req) || "{}");
    const message = String(payload.message || "").trim();
    const memory = Array.isArray(payload.memory) ? payload.memory.slice(-10) : [];
    if (!message) return sendJson(res, 400, { error: "Mesaj bos olamaz." });

    const history = memory.map(item => `${item.role === "user" ? "Kullanici" : "JARVIS"}: ${item.text}`).join("\n");
    const prompt = `Sen JARVIS'sin. iPhone'da calisan, Turkce konusan sicak ama net bir yol arkadasisin. Kisa, pratik ve dogal cevap ver.\n\nSon konusma:\n${history}\n\nKullanici: ${message}\nJARVIS:`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return sendJson(res, 500, { error: data?.error?.message || "Gemini istegi basarisiz." });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "Cevap alinamadi.";
    sendJson(res, 200, { text });
  } catch (error) {
    sendJson(res, 500, { error: error.message || String(error) });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST,GET,OPTIONS" });
    return res.end();
  }
  if (req.url === "/api/chat" && req.method === "POST") return handleChat(req, res);
  if (req.url === "/health") return sendJson(res, 200, { ok: true, hasKey: Boolean(readGeminiKey()) });

  const safeUrl = decodeURIComponent((req.url || "/").split("?")[0]);
  const relative = safeUrl === "/" ? "index.html" : safeUrl.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(publicDir, relative));
  if (!filePath.startsWith(publicDir)) return sendJson(res, 403, { error: "Yasak." });

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(publicDir, "index.html"), (fallbackErr, fallbackData) => {
        if (fallbackErr) return sendJson(res, 404, { error: "Bulunamadi." });
        res.writeHead(200, { "Content-Type": mime[".html"] });
        res.end(fallbackData);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`JARVIS Mobile PWA http://localhost:${port}`);
});
