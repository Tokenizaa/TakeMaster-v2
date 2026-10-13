# Production release runbook

Production URL: `https://takemaster-v2.olfnetto.workers.dev`

## Before release

Run from a clean checkout with Bun 1.3.14:

```sh
bun install --frozen-lockfile
bun run governance:check
bun run lint
bun run test
bun run build:worker
```

`build:worker` builds the SPA and validates the Worker bundle without deploying. The same checks run in GitHub Actions. Do not run the integration suite against the production database. Configure `.env.test` with an isolated Supabase project and test organization, then run it with an explicit write opt-in:

```sh
TAKE_MASTER_ALLOW_REMOTE_TEST_WRITES=1 bun run test:integration
```

The integration suite creates temporary program/production/episode rows and removes them during cleanup.

## Secrets and deployment

The Worker reads Supabase, session-signing, and NVIDIA NIM credentials from Cloudflare secrets. Check names without revealing values:

```sh
wrangler secret list --name takemaster-v2
```

Deploy the validated main branch with:

```sh
bun run deploy
```

## Production acceptance

After deployment, verify the public page and health endpoint:

```sh
curl -fsS -o /dev/null -w '%{http_code}\n' https://takemaster-v2.olfnetto.workers.dev/
curl -fsS https://takemaster-v2.olfnetto.workers.dev/api/health
```

The release is green when GitHub Actions passes, the page returns HTTP 200, `/api/health` reports `status: "ok"`, `database.connected: true`, and `ai.configured: true`, and an authorized smoke login can load `/api/state` with HTTP 200.

If a deployment fails acceptance, inspect the active deployment and roll back using Wrangler's deployment/version controls before retrying.
