# Relay — GitHub Pages interface + server-side relay

This folder contains the public-facing interface and a small allow-listed Cloudflare Worker backend.

## Public website

The main AppHub repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that tries to enable GitHub Pages and publish the repository when the app or proxy files change. Once deployment succeeds:

- AppHub: https://jayfrl009-spec.github.io/apphub1/
- Relay interface: https://jayfrl009-spec.github.io/apphub1/proxy/

## Important: frontend and backend are separate

GitHub Pages hosts static website files; it does not run a proxy server. The backend is `worker.js`, with a `wrangler.toml` configuration for Cloudflare Workers. A server-side hosting account and its authorization are required to deploy the Worker. This repository connection alone does not provide Cloudflare credentials, so the Worker is **not yet deployed**.

## Limits and allow-list

- The Worker defaults to allowing **only `example.com`**.
- It only accepts HTTPS target URLs and exact hostnames in `ALLOWED_HOSTS`.
- Use it only for domains you own or are authorized to relay.
- It is a basic GET-only reverse relay, not a universal web browser or an unblocker. Some sites will not work because of login sessions, JavaScript APIs, content policies, or other site-specific behavior.

## Deploy the backend

1. Deploy `worker.js` to a Worker service (Cloudflare Workers works with the included `wrangler.toml`).
2. Keep the default allow-list for a first test, or set `ALLOWED_HOSTS` to exact hostnames you own or are authorized to relay, separated by commas.
3. Copy the HTTPS URL of the deployed Worker.
4. Open the Relay interface, paste that URL into **Relay server URL**, and click **Test connection**.
5. Set the target URL to an HTTPS address on an allowed hostname and click **Open through Relay**.

To deploy with Wrangler, authenticate Wrangler using your own Cloudflare account in a terminal in this directory and run `npx wrangler deploy`. Keep the relay allow-listed; an unrestricted public relay can be abused and create security, legal, and bandwidth problems.
