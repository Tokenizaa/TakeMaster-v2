# Phase 1 — Foundation Status

Implemented in this branch:
- Supabase server configuration is centralized for the existing project `cvyoumtywnyayceoezru`.
- Server-side authenticated-user validation.
- NVIDIA NIM integration with Nemotron Super primary and Nemotron Ultra fallback.
- Strict AI JSON parsing and fallback handling.
- Program knowledge base and editorial identity/pauta flow.
- Frontend API/session helpers and program-level editorial UI.
- Productions / Seasons hierarchy preserved as part of program management.

Canonical persistence review:
- The live Supabase project is the canonical application database.
- The current V2 repository still contains a legacy SQLite persistence implementation in `src/server/persistence.ts`. This is a backend/frontend contract mismatch and must be removed from the runtime path.
- Supabase already contains the canonical relational model for programs, seasons, episodes, participants, agenda, library, AI generations, organizations and access control.
- No new database, mirror or second persistence architecture should be introduced.
- The next persistence work is consolidation: make the existing backend persistence functions read/write the current Supabase schema while preserving the existing frontend contracts and legacy IDs.

Current live-data baseline:
- Test records previously identified in `public.programs` were cleaned.
- The operational `public.programs` table currently contains the remaining real record(s), while `public.program_catalog` contains the RS Play catalog.
- `programs.catalog_program_id` is the canonical link between an operational program and its catalog entry and should be populated only when the match is verified.

Security review:
- Supabase RLS is enabled on the operational tables inspected.
- Live advisors still report two SECURITY DEFINER RPCs callable by authenticated users and several redundant permissive policies; these should be reviewed before relying on direct client-side Supabase access.
- Service-role credentials remain server-only.
