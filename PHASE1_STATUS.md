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
- Live Supabase schema inspection is now available and confirms the shared production schema includes programs, seasons, episodes, participants, agenda, library, AI generations, commercial plans and organization/program access structures.
- Existing CRUD endpoints are still backed by the V2 SQLite database. The persistence switch is the next implementation gate; no guessed migration was applied.
- API routes now require a validated Bearer token; the development/default-user fallback was removed. Database/RLS authorization still needs live verification against the current schema.
- No production schema migration has been applied.

Reason:
The connected Supabase project timed out during live schema inspection. Because V2 will share the V1 production data source, Phase 1 must not guess the schema or write migrations against an unverified state.

Required next gate:
1. Reconcile the live schema snapshot with the current V2 contracts and persistence functions.
2. Define the minimal V2 persistence adapter using the existing Supabase tables and legacy_id compatibility.
3. Migrate reads first, then writes, without changing frontend contracts.
4. Add database tests for allow/deny behavior and program/organization isolation.
5. Switch V2 CRUD from SQLite to Supabase only after read/write verification.

Security note:
The Supabase service-role credential is server-only. The browser receives only the publishable key. Authorization must be enforced server-side and/or through RLS; authentication in the UI is not treated as authorization.
