// Basic reverse relay for websites you own or are authorized to proxy.
// Configure ALLOWED_HOSTS as an exact comma-separated hostname allow-list.
// Default: example.com. This deliberately is not an open/unrestricted proxy.

function getHosts(env) {
  return new Set((env.ALLOWED_HOSTS || "example.com")
    .split(",").map(function(s){ return s.trim().toLowerCase().replace(/\.$/, ""); })
    .filter(Boolean));
}

function isSafeTarget(target, hosts) {
  if (target.protocol !== "https:") return false;
  if (target.username || target.password) return false;
  const host = target.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  return hosts.has(host);
}

function relayedUrl(raw, base, origin, hosts) {
  if (!raw || raw[0] === "#" || /^(data:|javascript:|mailto:|tel:|blob:)/i.test(raw)) return raw;
  try {
    const target = new URL(raw, base);
    if (!isSafeTarget(target, hosts)) return raw;
    return origin + "/browse?url=" + encodeURIComponent(target.href);
  } catch (_) {
    return raw;
  }
}

function relayHtml(html, targetUrl, origin, hosts) {
  html = html.replace(/\b(href|src|action|poster)\s*=\s*(["'])(.*?)\2/gi, function(all, name, quote, value) {
    return name + "=" + quote + relayedUrl(value, targetUrl, origin, hosts) + quote;
  });
  // Preserve relative URL behavior for resources a page does not explicitly rewrite.
  const escapedBase = targetUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  html = html.replace(/<head(\s[^>]*)?>/i, function(m){ return m + '<base href="' + escapedBase + '">'; });
  return html;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const cors = corsHeaders();

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return new Response("Only GET is supported by this starter.", { status: 405, headers: cors });

    if (requestUrl.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", allowedHosts: Array.from(getHosts(env)) }), {
        status: 200, headers: Object.assign({}, cors, { "Content-Type": "application/json; charset=utf-8" })
      });
    }

    if (requestUrl.pathname !== "/browse") {
      return new Response("Relay backend is running. Open the GitHub-hosted interface and connect this server.", {
        status: 200, headers: Object.assign({}, cors, { "Content-Type": "text/plain; charset=utf-8" })
      });
    }

    const hosts = getHosts(env);
    let target;
    try {
      const raw = requestUrl.searchParams.get("url");
      if (!raw) throw new Error("missing");
      target = new URL(raw);
    } catch (_) {
      return new Response("A valid https URL parameter is required.", { status: 400, headers: cors });
    }

    if (!isSafeTarget(target, hosts)) {
      return new Response("Blocked: this hostname is not in the relay's ALLOWED_HOSTS list. Only use domains you own or are authorized to relay.", {
        status: 403, headers: Object.assign({}, cors, { "Content-Type": "text/plain; charset=utf-8" })
      });
    }

    let upstream;
    try {
      upstream = await fetch(target.href, {
        method: "GET",
        headers: {
          "Accept": request.headers.get("Accept") || "*/*",
          "Accept-Language": request.headers.get("Accept-Language") || "en-US,en;q=0.8",
          "User-Agent": "AuthorizedSiteRelay/1.0"
        },
        redirect: "manual"
      });
    } catch (_) {
      return new Response("The target website could not be reached by the relay server.", { status: 502, headers: cors });
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("Location");
      if (location) {
        let next;
        try { next = new URL(location, target.href); } catch (_) {}
        if (next && isSafeTarget(next, hosts)) {
          return new Response(null, {
            status: upstream.status,
            headers: Object.assign({}, cors, { "Location": requestUrl.origin + "/browse?url=" + encodeURIComponent(next.href) })
          });
        }
        return new Response("The target redirected outside the configured allow-list.", { status: 403, headers: cors });
      }
    }

    const headers = new Headers(upstream.headers);
    ["content-length", "content-encoding", "content-security-policy", "content-security-policy-report-only", "x-frame-options", "set-cookie"].forEach(function(k){ headers.delete(k); });
    Object.keys(cors).forEach(function(k){ headers.set(k, cors[k]); });

    const contentType = upstream.headers.get("Content-Type") || "application/octet-stream";
    if (/text\/html/i.test(contentType)) {
      const html = relayHtml(await upstream.text(), target.href, requestUrl.origin, hosts);
      headers.set("Content-Type", "text/html; charset=utf-8");
      headers.delete("ETag");
      return new Response(html, { status: upstream.status, headers: headers });
    }

    return new Response(upstream.body, { status: upstream.status, headers: headers });
  }
};