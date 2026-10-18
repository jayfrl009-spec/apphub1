const {
  getAllowedHosts,
  isAllowedUrl,
  getRequestOrigin,
  rewriteHtml
} = require("../lib/relay");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("This relay only supports GET requests.");
  }

  const origin = getRequestOrigin(req);
  const hosts = getAllowedHosts();
  const raw = typeof req.query.url === "string" ? req.query.url : "";

  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).send("Enter a valid HTTPS URL.");
  }

  if (!isAllowedUrl(target, hosts)) {
    return res.status(403).send(
      "Blocked: this hostname is not on the relay's ALLOWED_HOSTS list. " +
      "This starter only relays HTTPS sites that its owner explicitly allows."
    );
  }

  let upstream;
  try {
    upstream = await fetch(target.href, {
      method: "GET",
      headers: {
        "Accept": typeof req.headers.accept === "string" ? req.headers.accept : "text/html,*/*",
        "Accept-Language": typeof req.headers["accept-language"] === "string"
          ? req.headers["accept-language"] : "en-US,en;q=0.8",
        "User-Agent": "AuthorizedSiteRelay/1.0"
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    return res.status(502).send("The target website could not be reached by the relay.");
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    if (!location) return res.status(upstream.status).send("The target returned a redirect without a location.");
    let next;
    try { next = new URL(location, target.href); } catch {}
    if (!next || !isAllowedUrl(next, hosts)) {
      return res.status(403).send("Blocked redirect: the destination is outside the configured allow-list.");
    }
    res.setHeader("Location", origin + "/api/browse?url=" + encodeURIComponent(next.href));
    return res.status(upstream.status).end();
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const declaredLength = Number(upstream.headers.get("content-length") || 0);
  if (declaredLength > 5_000_000) {
    return res.status(413).send("The target response is too large for this basic relay.");
  }

  res.status(upstream.status);
  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");

  if (/text\/html/i.test(contentType)) {
    try {
      const html = await upstream.text();
      if (Buffer.byteLength(html, "utf8") > 5_000_000) {
        return res.status(413).send("The target HTML is too large for this basic relay.");
      }
      return res.send(rewriteHtml(html, target.href, origin, hosts));
    } catch {
      return res.status(502).send("Could not read the target HTML.");
    }
  }

  const arrayBuffer = await upstream.arrayBuffer();
  if (arrayBuffer.byteLength > 5_000_000) {
    return res.status(413).send("The target response is too large for this basic relay.");
  }
  return res.send(Buffer.from(arrayBuffer));
};