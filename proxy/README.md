# Relay — Vercel-hosted interface and restricted API

The AppHub repository is configured to deploy through Vercel's Git integration. It contains a static website at the root, a Relay page under `proxy/`, and two server-side endpoints:

- `/api/health` — reports that the relay endpoint is reachable.
- `/api/browse?url=https%3A%2F%2Fexample.com%2F` — fetches and returns an allowed HTTPS page.

## Access and limits

The server allow-list defaults to exactly `example.com`. It will refuse every other hostname unless the project owner explicitly configures the `ALLOWED_HOSTS` environment variable in Vercel to include additional sites they own or have permission to relay. The relay uses GET only, restricts target URLs to HTTPS, blocks redirects outside the allow-list, and has a small response-size cap.

This is a basic reverse relay and will not work with every website. Some sites depend on sign-in state, complex client-side behavior, anti-bot controls, or additional APIs. It is not a universal unblocker and should not be used to evade network rules or website access controls.

## Vercel deployment

The project root is the repository root. The `api/` directory is automatically deployed as Vercel Functions. When a Vercel URL is opened, the Relay page automatically uses that same origin's `/api` endpoints; no separate backend URL is needed.

If the domain hasn't been provisioned yet, use Vercel to import `jayfrl009-spec/apphub1` and deploy the `main` branch. After that, new pushes to `main` trigger deployments.

## Optional Cloudflare Worker

The earlier `worker.js` and `wrangler.toml` files remain as an alternate example. They are not used by the Vercel API routes.
