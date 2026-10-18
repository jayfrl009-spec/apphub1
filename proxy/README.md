# Relay — Vercel-hosted interface and restricted API

The AppHub repository contains the Relay interface at `/proxy/` and API endpoints:

- `/api/health` — reports which hostname patterns are enabled.
- `/api/browse?url=https%3A%2F%2Fexample.com%2F` — fetches a permitted HTTPS page.

## Enable more approved public sites

The relay intentionally uses an allow-list rather than acting as an unrestricted public proxy. By default, only `example.com` is allowed.

To add websites you own or are authorized to relay:

1. Open the AppHub project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Open **Settings → Environment Variables**.
3. Add `ALLOWED_HOSTS` with comma-separated hostnames, for example `example.com,docs.example.org,*.myschool.edu`.
4. Select Production (and Preview/Development too if needed), save, and redeploy.

Exact hostnames match only that hostname. A pattern like `*.example.org` matches subdomains such as `docs.example.org` but does not match the root `example.org`; include both `example.org,*.example.org` to permit both.

The relay accepts HTTPS only, does not accept IP literal/private host destinations, allows GET requests only, blocks redirects outside the allow-list, and limits response size. Keep domains restricted to sites you own or have permission to access. An unrestricted relay can be abused and should not be used to evade network, account, or website restrictions.

## Limitations

This is a basic reverse relay, not a full browser. Some pages may fail if they require login cookies, use complex client-side APIs, rely on blocked cross-origin requests, or enforce anti-bot controls. A domain may require several related hostnames to be added because styles, scripts, and media are sometimes served from separate domains.

## Deploy

Vercel's Git integration deploys updates from the repository's `main` branch. The `api/` directory is deployed as server-side functions; the interface automatically connects to the same origin's `/api` endpoints.

The old `worker.js` and `wrangler.toml` files are retained as an alternate reference and are not used by the Vercel endpoints.
