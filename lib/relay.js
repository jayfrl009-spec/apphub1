const DEFAULT_ALLOWED_HOSTS = ["example.com"];

function getAllowedHosts() {
  const configured = (process.env.ALLOWED_HOSTS || "").split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_HOSTS);
}

function isAllowedUrl(url, hosts) {
  if (!(url instanceof URL) || url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
  return hosts.has(hostname);
}

function getRequestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return "";
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return proto + "://" + host;
}

function relayUrl(raw, baseUrl, origin, hosts) {
  if (!raw || /^(#|data:|javascript:|mailto:|tel:|blob:)/i.test(raw.trim())) return raw;
  try {
    const destination = new URL(raw, baseUrl);
    if (!isAllowedUrl(destination, hosts)) return raw;
    return origin + "/api/browse?url=" + encodeURIComponent(destination.href);
  } catch {
    return raw;
  }
}

function rewriteHtml(html, targetUrl, origin, hosts) {
  const rewritten = html.replace(/\b(href|src|action|poster)\s*=\s*(["'])(.*?)\2/gi,
    (all, attr, quote, value) => attr + "=" + quote +
      relayUrl(value, targetUrl, origin, hosts) + quote);

  // A base URL preserves relative references that aren't recognized HTML attributes.
  const base = targetUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return rewritten.replace(/<head(\s[^>]*)?>/i,
    (head) => head + '<base href="' + base + '">');
}

module.exports = { getAllowedHosts, isAllowedUrl, getRequestOrigin, rewriteHtml };