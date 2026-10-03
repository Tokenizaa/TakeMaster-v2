# TakeMaster V2 — Architecture Baseline

Status: Executed as Phase 0 baseline
Date: 2026-09-30
Repositories:
- V1: Tokenizaa/TakeMaster
- V2: Tokenizaa/TakeMaster-v2

## 1. Phase 0 objective

Establish the architectural baseline for V2 before implementing the new persistence, authentication, operational workspace, AI integration, and Cloudflare deployment.

The governing decision is:

> V2 is a deliberate reconstruction of the product, not a continuation of V1 and not a blind fork of V1 code.

V2 will preserve the proven editorial product model, reuse the existing Supabase/Postgres data source, continue using NVIDIA as the AI provider, and receive a new Cloudflare deployment.

## 2. Fixed architectural constraints

### 2.1 Database

V2 will use the existing Supabase/Postgres project used by the V1 product.

Consequences:
- No parallel V2 production database.
- Existing identifiers and relationships must be mapped before writes are introduced.
- V2 must not silently reinterpret existing production data.
- Any schema change must be introduced through a reviewed migration.
- Development/staging must be isolated from production writes.

Live Supabase inspection was attempted during Phase 0 against the connected RSPlay project, but the database connection timed out. Therefore the current document distinguishes repository evidence from live-database facts. Live schema/RLS verification is a Phase 1 prerequisite and must happen before enabling V2 production writes.

### 2.2 AI

V2 will continue using NVIDIA NIM.

V1 already has a dedicated server AI boundary with:
- NIM base URL;
- API key;
- primary model;
- fallback model;
- timeout;
- HTTP error handling;
- JSON response mode;
- JSON parsing.

V2 currently uses @google/genai/Gemini and therefore must replace that integration rather than preserve it.

The V2 AI boundary must remain provider-isolated so UI/domain code does not depend directly on NVIDIA SDK or HTTP details.

### 2.3 Hosting

V2 will receive a new Cloudflare deployment.

Target direction:
- React/Vite client;
- Cloudflare Worker as server/API boundary;
- Wrangler-managed configuration;
- separate Cloudflare environment/secrets from V1;
- Supabase remains the persistent system of record;
- NVIDIA remains the AI provider.

Cloudflare's current Vite integration officially supports React SPAs plus a Worker API and deployment of the application as a unit.

## 3. V1 versus V2 — current baseline

### 3.1 Product/domain overlap

Both versions contain the same fundamental editorial workflow:
- programs/shows;
- episodes;
- participants/guests;
- editorial diagnosis;
- research;
- outline/segments;
- questions;
- follow-ups;
- script;
- cameras;
- production assets;
- shorts;
- recording markers;
- technical checklist;
- studio/recording preparation;
- AI-assisted generation.

This confirms that the V2 starting model represents the original product core rather than a different product.

### 3.2 V1 improvements that are architectural, not merely UI

V1 added:
- Supabase/Postgres persistence;
- organization and access context;
- authentication;
- authorization/RLS;
- commercial program catalog;
- production agenda;
- library/assets;
- onboarding;
- server-side persistence wrappers;
- relational mappings;
- migrations;
- monitoring/logging;
- automated tests;
- Cloudflare/Worker runtime preparation.

These capabilities are candidates for V2, but their implementation will be redesigned around V2 contracts rather than copied file-for-file.

### 3.3 V1 debt that V2 must not reproduce

The V1 type contract contains many compatibility aliases and historical fields, including:
- Show/Program aliases;
- Guest/Participant aliases;
- OutlineBlock/Segment aliases;
- showId/programId compatibility;
- multiple duration field names;
- multiple camera aliases;
- multiple asset/material aliases;
- legacy_id alongside current ids;
- date/scheduledDate aliases;
- several fields retained solely for historical frontend compatibility.

The V1 mapper layer also contains fallback normalization designed to prevent the old db.json contract from producing relational database errors.

These mechanisms are useful evidence about historical problems, but they must not automatically become permanent V2 architecture.

## 4. Canonical V2 domain model

The proposed canonical hierarchy is:

User
  -> Organization
    -> Program
      -> Production
        -> Episode
          -> Participants
          -> Content
          -> Operations
          -> Assets

### 4.1 Program

Canonical concept for a recurring show/product.

Core attributes:
- id;
- organizationId;
- name/title;
- description;
- presenter/host;
- format;
- default duration;
- editorial style;
- audience/tone;
- scenario;
- default cameras;
- standard structure;
- default opening/closing;
- timestamps.

### 4.2 Participant

Canonical concept replacing the narrow V2 Guest concept.

A participant can be:
- individual;
- group/band/duo;
- host;
- co-host;
- guest;
- specialist;
- panelist;
- other production participant.

The exact relational representation must be verified against the existing Supabase schema before implementation.

### 4.3 Episode

Canonical production/editorial aggregate.

Core identity:
- id;
- programId;
- episode number;
- title;
- idea/topic;
- format;
- duration;
- presenter;
- objective;
- status;
- timestamps.

Nested/related domains:
- diagnosis;
- research;
- segments;
- participants;
- questions;
- follow-ups;
- script;
- cameras;
- assets;
- shorts;
- recording markers;
- checklist;
- script versions;
- scheduling/production context.

### 4.4 Production

V2 currently lacks an explicit Production entity. This must be evaluated against the existing database before introducing it.

The concept is intended to separate:
- a recurring Program;
- a specific production/run/context;
- individual Episodes.

If the existing V1 schema does not support a clean Production concept, V2 should not invent one merely for architectural elegance. The relationship must be justified by real product requirements and existing data.

## 5. Canonical naming decisions

| Historical/V1/V2 name | V2 direction |
|---|---|
| Show | Program |
| Guest | Participant |
| OutlineBlock | Segment |
| ProductionAsset / Material | ProductionAsset |
| Episode | Episode |
| CameraConfig | CameraConfig |
| PlannedShort | PlannedShort |
| RecordingMarker | RecordingMarker |
| TechnicalChecklist | TechnicalChecklist |
| AgendaEvent | AgendaEvent |
| LibraryAsset | LibraryAsset |

Compatibility aliases should live at explicit migration/API boundaries if needed, not in the core domain model.

## 6. Data ownership

The following ownership model is proposed:

Program owns:
- program identity;
- defaults;
- recurring structure;
- default cameras;
- program-level participants where applicable.

Episode owns:
- episode-specific editorial state;
- episode participants;
- diagnosis;
- research;
- segments;
- questions/follow-ups;
- script;
- production assets;
- shorts;
- recording state;
- technical state.

Organization owns:
- access boundary;
- program membership;
- subscriptions/entitlements where applicable.

User owns:
- identity;
- membership/access relationships;
- user-specific preferences where justified.

## 7. Architecture target

Target dependency direction:

UI
  |
  v
Application/API
  |
  v
Domain
  |
  +---- Persistence
  |
  +---- AI Provider
  |
  +---- External services

Rules:
- UI never provides security.
- Domain models do not depend on Supabase row shape.
- Domain models do not depend on NVIDIA request/response shape.
- Persistence translates between domain and database representations.
- AI generation produces validated domain data before persistence.
- Compatibility code is kept at explicit boundaries.

## 8. API boundary

The V2 API should evolve from the current generic CRUD endpoints into explicit application contracts.

Current V2 endpoints conceptually expose:
- /api/shows
- /api/episodes
- /api/guests
- /api/ai/*

Target terminology should become:
- /api/programs
- /api/episodes
- /api/participants
- /api/agenda
- /api/library
- /api/ai/*

A compatibility route may be temporarily retained only when required to support an existing client during migration. It should have an explicit removal condition.

## 9. Persistence baseline

V2 currently persists to local JSON through src/server/db.ts.

This is explicitly a temporary development mechanism and must not become the production persistence model.

V1 already demonstrates the intended relational direction:
- Supabase REST access;
- UUID database IDs;
- legacy IDs;
- relational child collections;
- RPC for aggregate episode persistence;
- relational tables for segments, questions, follow-ups, scripts, assets, markers, participants, cameras, agenda and library.

V2 will reuse the existing database rather than create a second production store.

## 10. Important V1 persistence findings

The V1 mapper layer exists partly because the frontend contract and relational schema diverged over time.

Examples:
- UUID database IDs are translated to legacy IDs for the frontend;
- snake_case database fields become camelCase;
- multiple historical aliases are returned;
- invalid enum values can be normalized to null/defaults;
- missing IDs can be generated;
- agenda date fields are exposed under multiple names;
- program participants are projected from relational rows;
- episode child collections are reconstructed from multiple tables.

V2 must not reproduce these behaviors blindly.

The Phase 1 persistence design must instead establish:
1. one canonical V2 identifier;
2. one canonical field name;
3. explicit nullable/default semantics;
4. explicit enum validation;
5. explicit ownership and foreign keys;
6. explicit compatibility policy.

## 11. AI baseline

V1:
- NVIDIA NIM;
- dedicated server boundary;
- primary/fallback model;
- timeout;
- structured JSON response mode;
- strict parse failure;
- structured logging.

V2:
- currently Gemini;
- parser returns fallback data on invalid JSON.

Decision:
- replace Gemini with the NVIDIA boundary;
- preserve the useful reliability concepts from V1;
- do not preserve silent fallback-to-valid-looking-data behavior;
- invalid AI output must be an observable application error;
- generated output must be runtime-validated against the expected domain contract.

## 12. Cloudflare baseline

V1 contains Worker/Wrangler-related infrastructure.

V2 currently runs:
- Express server;
- tsx runtime;
- Vite frontend.

Decision:
- do not blindly copy the V1 Worker setup;
- adapt the V2 application to the current Cloudflare Vite/Workers integration;
- isolate runtime-specific code;
- keep the domain/application layers independent of Express and Cloudflare;
- create a new V2 Worker/deployment;
- establish environment-specific secrets;
- validate local Worker runtime before production deployment.

## 13. Phase 0 decisions

### ADR-001 — V2 is a reconstruction, not a V1 fork
Status: ACCEPTED

V2 keeps the product learning from V1 while avoiding historical implementation debt.

### ADR-002 — Existing Supabase database remains the production data source
Status: ACCEPTED

No parallel production database will be created for V2.

### ADR-003 — NVIDIA remains the AI provider
Status: ACCEPTED

V2 replaces the current Gemini integration with the NVIDIA boundary used by V1.

### ADR-004 — V2 gets a new Cloudflare deployment
Status: ACCEPTED

V2 does not share the V1 application deployment/runtime configuration.

### ADR-005 — Canonical domain vocabulary
Status: ACCEPTED

Program, Participant, Segment and Episode are the preferred V2 domain concepts. Historical aliases are compatibility concerns, not canonical domain concepts.

### ADR-006 — Compatibility is temporary and explicit
Status: ACCEPTED

No compatibility field, route or mapper is added without a documented reason and removal/retention decision.

### ADR-007 — Live database schema verification gates production persistence
Status: ACCEPTED

Repository code alone is insufficient to establish the actual production schema. Live schema, RLS, migrations and representative relationships must be verified before V2 writes to the shared database.

## 14. Phase 0 open items / gates for Phase 1

The following items could not be verified during this execution because the connected Supabase database timed out:

- actual current table list;
- actual current columns and foreign keys;
- current RLS policies;
- current migration history;
- current row counts;
- current database functions/RPCs;
- actual data quality;
- existing ID distribution;
- production schema drift versus repository migrations.

These are not assumptions. They are explicit Phase 1 gates.

## 15. Phase 1 entry criteria

Phase 1 may start after:
- live Supabase connectivity is available;
- complete schema snapshot is obtained;
- RLS/access policies are inspected;
- migration history is reconciled with the repository;
- canonical IDs are mapped;
- V1/V2 data relationships are documented;
- V2 authentication model is defined;
- Cloudflare runtime constraints are confirmed;
- NVIDIA credentials/model configuration strategy is defined without exposing secrets.

## 16. Phase 0 result

Phase 0 establishes the following architecture:

Cloudflare V2
  -> V2 Application/API
      -> Canonical V2 Domain
          -> Existing Supabase/Postgres
          -> NVIDIA AI

The product core remains the V2 editorial model.

The operational improvements from V1 are adopted selectively.

The V1 compatibility machinery is treated as historical evidence rather than architecture to copy.

The next implementation phase is the foundation: live database verification, schema/access mapping, authentication/authorization, canonical persistence contracts, and safe V2 API boundaries.
