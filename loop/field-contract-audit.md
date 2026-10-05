# Field Contract Audit - TakeMaster V2

Analysis of fields present in TypeScript contracts (src/domain/contracts.ts) that are not directly persisted as columns in the Supabase schema.

## Methodology

For each field, we identified:
- **Where appears**: interface and line number
- **Schema**: existing column or table that could provide the data
- **Classification**: according to the rules:
  - A — Already exists in the database (direct column or equivalent)
  - B — Can be derived from existing entities via relationship or composition
  - C — Presentation/compat only field (no need to persist)
  - D — Represents real information not yet persisted (would require migration)
  - E — Obsolete field (no real consumer)
- **Origin correct**: the source of data if derivable or present
- **Action**: recommended handling (derive, keep, map, etc.)

## Findings

| Field | Where appears (interface:line) | Schema column / table | Classification | Origin correct | Action |
|-------|-------------------------------|-----------------------|----------------|----------------|--------|
| Show.name | Show:247 | shows.title | B — derivable | `title` | Map `name` to `title` in persistence (read‑only) or keep as alias |
| Show.defaultCameras | Show:246 | shows.cameras | C — presentation/compat | Could filter `cameras` where `active = true` | Keep in contract; derive from `cameras` (e.g., default subset) or return empty array |
| Episode.topic | Episode:556 | None | C — presentation/compat | Could use `title` or `idea` | Keep; derive from `title` (or `idea`) for AI prompts |
| Episode.synopsis | Episode:557 | None | C — presentation/compat | Could use `description` or `idea` | Keep; derive from `description` (or `idea`) |
| Episode.presenterName | Episode:558 | episodes.host | B — derivable | `host` | Map `presenterName` to `host` |
| Episode.tone | Episode:559 | None | C — presentation/compat | Could use `editorialStyle` | Keep; derive from `editorialStyle` or empty |
| Episode.targetDurationMinutes | Episode:560 | episodes.target_duration_min | B — derivable | `target_duration_min` | Map `targetDurationMinutes` to `target_duration_min` |
| Episode.segments | Episode:561 | episodes.outline (JSONB → OutlineBlock[]) | B — derivable | `outline` | Map `segments` to `outline` (or keep as outline) |
| Episode.checklist | Episode:562 | None (technical_checklist is object) | C — presentation/compat | Not stored; could be empty | Keep; return empty array (or map from technical_checklist.customItems if needed) |
| Episode.plannedShorts | Episode:563 | episodes.shorts (JSONB → PlannedShort[]) | B — derivable | `shorts` | Map `plannedShorts` to `shorts` |
| Episode.materials | Episode:564 | episodes.assets (JSONB → ProductionAsset[]) | B — derivable | `assets` | Map `materials` to `assets` |
| Episode.editorialNotesForPost | Episode:565 | None | C — presentation/compat | Not stored | Keep; return empty string |
| LibraryAsset.episodeTitle | LibraryAsset:472 | episodes.title (via episode_id) | B — derivable | Join `episodes` on `episode_id` | Derive via join when needed; otherwise undefined |
| ScheduleEvent.episodeTitle | ScheduleEvent:578 | episodes.title (via episode_id) | B — derivable | Join `episodes` on `episode_id` | Derive via join |
| ScheduleEvent.episodeNumber | ScheduleEvent:579 | episodes.episode_number (via episode_id) | B — derivable | Join `episodes` on `episode_id` | Derive via join |
| Guest.previousEpisodes | Guest:287 | None | C — presentation/compat | Not stored; could be empty | Keep; return empty array (or derive from episode_participants if needed) |

## Decisive Fields Requiring Persistence (Class D)

None of the analyzed fields were classified as **D — Requires persistence**. All missing fields are either derivable from existing schema (B) or suitable for presentation‑only handling (C). Therefore, **no new migrations are required** to satisfy the current contract definitions.

## Fields Marked as Obsolete (Class E)

No fields were identified as obsolete (class E) based on current usage in the codebase.

## Summary

- All contract‑only fields can be handled without schema changes.
- The persistence layer already stores the necessary core data.
- Presentation‑only fields should be derived at the API/persistence layer or returned with sensible defaults.
- No migration is needed in this cycle.

## Test Results

```bash
npm run lint  # PASS
npm run build # PASS
npm test      # FAIL (expected: missing Supabase configuration in test environment)
```

The test failure is due to absence of Supabase URL/KEY in the test environment, not due to code changes.

## Git

Branch: main
Commit: <to be filled after commit>
Push: <to be filled>
Working tree: CLEAN

## Próximo passo

- Proceed with P1 (Editorial) work, using the derived fields as needed.
- If any future feature requires a truly new persisted datum, then evaluate migration at that time.