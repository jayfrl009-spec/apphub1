# Relay — GitHub-hosted interface + server-side relay

This folder contains a browser interface and a small Cloudflare Worker backend. **GitHub Pages can only host the static interface**; it cannot run the server-side proxy itself. That is why the backend file is separate.

## Scope and limitations

- The Worker defaults to allowing **only `example.com`**.
- It only accepts HTTPS target URLs and exact hostnames in `ALLOWED_HOSTS`.
- Use it only for domains you own or are authorized to relay.
- It is a basic GET-only reverse relay, not a universal web browser or an unblocker. Some sites will not work because of login sessions, JavaScript APIs, content policies, or other site-specific behavior.

## Connect the interface

1. Deploy `worker.js` to a Worker service (Cloudflare Workers is supported by the included `wrangler.toml`).
2. Keep the default allow-list for a first test, or set `ALLOWED_HOSTS` to exact hostnames you own or are authorized to relay, separated by commas.
3. Copy the HTTPS URL of the deployed Worker.
4. Open the GitHub Pages interface in `index.html`, paste the Worker URL into **Relay server URL**, and click **Test connection**.
5. Set the target URL to an HTTPS address on an allowed hostname and click **Open through Relay**.

## Deploy with Wrangler

Install Node.js, open a terminal in this folder, authenticate Wrangler with your own Cloudflare account, and run:

```bash
npx wrangler deploy
```

The default configuration permits only `example.com`. Do not turn this into an unrestricted public proxy: unrestricted relays can be abused and can expose the host to legal, security, and bandwidth problems.

## GitHub Pages

The interface is in `index.html` inside this folder. If the parent repository's GitHub Pages source publishes the repository root, this page is available at:

`https://jayfrl009-spec.github.io/apphub1/proxy/`

If Pages is not already enabled for the parent repository, enable it under **Settings → Pages**. This publishes the interface only; it does not deploy the Worker.
