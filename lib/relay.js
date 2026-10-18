const DEFAULT_ALLOWED_HOSTS = ["example.com"];

function normalizeAllowedHost(input) {
  const host = String(input || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host) return null;
  if (host.startsWith("*.")) {
    const base = host.slice(2);
    return isSafeHostnamePattern(base) ? "*." + base : null;
  }
  return isSafeHostnamePattern(host) ? host : null;
}

function isSafeHostnamePattern(host) {
  if (!host || host.length > 253 || !host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (host.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
  const labels = host.split(".");
  if (!/[a-z]/.test(labels[labels.length - 1])) return false;
  return labels.every((label) =>
    label.length > 0 && label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  );
}

function getAllowedHosts() {
  const configured = (process.env.ALLOWED_HOSTS || "")
    .split(",")
    .map(normalizeAllowedHost)
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_HOSTS);
}

function matchesAllowedHost(hostname, allowedHosts) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  for (const entry of allowedHosts) {
    if (entry.startsWith("*.")) {
      const base = entry.slice(2);
      if (host.endsWith("." + base)) return true;
    } else if (host === entry) {
      return true;
    }
  }
  return false;
}

function isAllowedUrl(url, hosts) {
  if (!(url instanceof URL) || url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!isSafeHostnamePattern(hostname)) return false;
  return matchesAllowedHost(hostname, hosts);
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

  const base = targetUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return rewritten.replace(/<head(\s[^>]*)?>/i,
    (head) => head + '<base href="' + base + '">');
}

module.exports = { getAllowedHosts, isAllowedUrl, matchesAllowedHost, getRequestOrigin, rewriteHtml };
