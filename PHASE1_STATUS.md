# Phase 1 — Foundation Status

Implemented in this branch:
- Supabase server boundary using the existing V1 project configuration.
- Server-side authenticated-user validation.
- Centralized server configuration for Supabase and NVIDIA.
- Health endpoint with Supabase connectivity and NVIDIA configuration status.
- Explicit application error primitives.
- Client Supabase session helper.
- Client API fetch helper that can attach the current Supabase access token.
- NVIDIA NIM integration replacing the V2 Gemini dependency.
- Primary/fallback NIM model handling and timeout.
- Strict AI JSON parsing: invalid output is an error, not silent fallback data.
- Environment template for the shared Supabase project and NVIDIA.

Not yet enabled:
- Existing CRUD endpoints are still backed by the V2 JSON database. They are not switched to the shared production database yet.
- Existing UI is not yet gated by authentication because the shared database/RLS model has not been live-verified.
- No production schema migration has been applied.

Reason:
The connected Supabase project timed out during live schema inspection. Because V2 will share the V1 production data source, Phase 1 must not guess the schema or write migrations against an unverified state.

Required next gate:
1. Obtain a successful live Supabase connection.
2. Snapshot tables, columns, foreign keys, RLS policies, grants, functions/RPCs and migration history.
3. Reconcile that snapshot with the V1 repository migrations and persistence layer.
4. Define the V2 persistence adapter and authorization predicates.
5. Add database tests for allow/deny behavior.
6. Only then switch V2 CRUD from JSON to Supabase.

Security note:
The Supabase service-role credential is server-only. The browser receives only the publishable key. Authorization must be enforced server-side and/or through RLS; authentication in the UI is not treated as authorization.
