/**
 * local-echo-server.mjs
 * ─────────────────────
 * A minimal HTTP echo server that matches httpbin.org's JSON response shape
 * so the Hoppscotch collection test suite can run without internet access.
 *
 * Endpoints supported:
 *   GET  /get          → { args, headers, url }
 *   POST /post         → { data, headers, json, url }
 *   GET  /html         → <html>…</html>  (used by the cheerio test)
 *   ANY  /anything     → { args, data, headers, method, url }
 *   ANY  /*            → same generic echo
 *
 * Headers are echoed with httpbin-style title-case normalisation
 * so X-Request-ID → X-Request-Id (matching existing test assertions).
 *
 * Usage:
 *   node local-echo-server.mjs          # starts on port 4321
 *   PORT=8080 node local-echo-server.mjs
 */

import http from 'http'

const PORT = process.env.PORT ?? 4321

// ── title-case normaliser (matches httpbin behaviour) ────────────────────────
function titleCaseHeader(name) {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-')
}

// ── collect request body ─────────────────────────────────────────────────────
function readBody(req) {
  return new Promise(resolve => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

// ── build echoed headers object ──────────────────────────────────────────────
function echoHeaders(req) {
  const out = {}
  for (const [k, v] of Object.entries(req.headers)) {
    // skip internal / hop-by-hop headers (host is kept like httpbin does)
    out[titleCaseHeader(k)] = v
  }
  return out
}

// ── parse query string ───────────────────────────────────────────────────────
function parseArgs(url) {
  const u = new URL(url, 'http://localhost')
  const args = {}
  u.searchParams.forEach((v, k) => { args[k] = v })
  return args
}

// ── simple HTML page (used by cheerio test) ──────────────────────────────────
const HTML_PAGE = `<!DOCTYPE html>
<html>
<head><title>API Status Page</title></head>
<body>
  <h1 class="title">Service Status</h1>
  <ul id="services">
    <li class="status ok" data-service="auth">Auth: Online</li>
    <li class="status ok" data-service="api">API: Online</li>
    <li class="status warn" data-service="db">DB: Degraded</li>
  </ul>
  <p class="updated">Last updated: 2024-01-15 10:30 UTC</p>
</body>
</html>`

// ── server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const body = await readBody(req)
  const headers = echoHeaders(req)
  const args = parseArgs(req.url)

  // HTML endpoint for cheerio test
  if (req.url === '/html') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(HTML_PAGE)
    return
  }

  // Parse JSON body if applicable
  let jsonBody = null
  try {
    if (body && req.headers['content-type']?.includes('application/json')) {
      jsonBody = JSON.parse(body)
    }
  } catch (_) {}

  const payload = {
    args,
    data: body || '',
    headers,
    json: jsonBody,
    method: req.method,
    origin: req.socket.remoteAddress,
    url: `http://localhost:${PORT}${req.url}`,
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload, null, 2))

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} → 200`)
  if (headers['X-Request-Id']) {
    console.log(`  X-Request-Id echoed: ${headers['X-Request-Id']}`)
  }
})

server.listen(PORT, () => {
  console.log(`\n🚀 Local echo server running at http://localhost:${PORT}`)
  console.log(`   Mimics httpbin.org response format`)
  console.log(`   Press Ctrl+C to stop\n`)
})

