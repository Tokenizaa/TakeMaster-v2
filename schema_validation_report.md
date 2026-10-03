TakeMaster-v2 Supabase Schema Validation Complete
================================================

## Executive Summary

The Supabase schema for TakeMaster-v2 has a strong foundation with most core tables already in place.
However, there are several areas that need adjustment to fully align with application requirements.

## Schema Compatibility Assessment

### 1. Show / Program Mapping

**Status:** Mostly Compatible with Notable Gaps

**Matching Fields:**
- id, description, format, standard_structure, default_opening, default_closing, created_at, updated_at

**Mismatches:**
- title: Application expects required string, DB has nullable `name` field (plus redundant nullable `title`)
- host: Application expects required string, DB has nullable string
- editorialStyle: Application expects required string, DB has nullable `editorial_style`
- scenario: Application expects required string, DB has nullable `scenario`
- cameras: Application expects `CameraConfig[]`, implemented via separate `cameras` table with program_id FK

**Required Adjustments:**
- Make `name`, `host`, `editorial_style`, `scenario`, `default_opening`, `default_closing` NOT NULL
- Consider removing redundant `title` field or making it the primary title field

### 2. Episode Mapping

**Status:** Mostly Compatible with Notable Gaps

**Matching Fields:**
- id, program_id (showId), title, additional_info, objective, editor_script_synthesis, recording_time_elapsed, created_at, updated_at

**Related Tables (Correctly Implemented):**
- outline: `segments` table (episode_id FK)
- questions: `questions` table (episode_id FK)
- script: `script_items` table (episode_id FK)
- cameras: `cameras` table (via program_id)
- assets: `library_assets` table (program_id and/or episode_id FK)
- shorts: `planned_shorts` table (episode_id FK)
- recordingMarkers: `recording_markers` table (episode_id FK)
- technicalChecklist: `technical_checklist` Json field
- versions: `episode_versions` table (episode_id FK)

**Mismatches:**
- episodeNumber: Application expects required number, DB has nullable number
- idea: Application expects required string, DB has nullable string
- host: Application expects required string, DB has nullable `host` and `presenter_name` fields
- format: Application expects ShowFormat enum, DB has string (needs CHECK constraint)
- status: Application expects EpisodeStatus enum, DB has string (needs CHECK constraint)
- diagnosis: Application expects required EditorialDiagnosis, DB has nullable Json
- research: Application expects required ResearchData, DB has nullable Json
- guestName/guestId: No direct fields; requires joining with participants table

**Required Adjustments:**
- Make `episode_number`, `idea`, `host` (or `presenter_name`) NOT NULL
- Add CHECK constraints for `format` and `status` enums
- Make `diagnosis` and `research` Json fields NOT NULL
- Consider adding direct foreign key from episodes to participants for guest/host relationships

### 3. Guest/Participant Mapping

**Status:** Mostly Compatible with Notable Gaps

**Matching Fields:**
- id, name, links[], created_at

**Mismatches:**
- role: Application expects required string, DB has nullable string
- company: Application expects required string, DB has nullable string
- bio: Application expects required string, DB has nullable string
- contacts: Application expects required string, DB has nullable string
- notes: Application expects required string, DB has nullable string
- previousEpisodes: Application expects string[], DB has number|null (type mismatch and nullability)
- previousResearchSummary: Missing entirely

**Required Adjustments:**
- Make `role`, `company`, `bio`, `contacts`, `notes` NOT NULL
- Fix `previous_episodes` type: Change to text[] to store episode IDs OR create separate participant_episode_history table
- Add `previous_research_summary` text field to participants table

### 4. Organization Mapping

**Status:** Good Compatibility

**Matching Fields:**
- id, name, slug, status, created_at, updated_at

### 5. Membership Structure

**Status:** Good Compatibility

**Matching Tables:**
- organization_members: id, organization_id, user_id, role, active, created_at, updated_at

### 6. Program Access & Subscription Structure

**Status:** Good Compatibility

**Matching Tables:**
- program_catalog, commercial_plans, plan_programs, organization_subscriptions, organization_programs, program_user_access

## Recommended TypeScript Type Updates

Instead of using raw Supabase database types directly, create application-specific types that:
1. Remove nullability where business logic requires values
2. Add proper enum types for validated fields
3. Provide joined types that include commonly needed related data

Example application-friendly Show type:
```typescript
export interface Show {
  id: string;
  title: string; // non-nullable
  description: string;
  host: string; // non-nullable
  format: ShowFormat; // enum
  editorialStyle: string; // non-nullable
  scenario: string; // non-nullable
  cameras: CameraConfig[]; // joined from cameras table
  standardStructure: string[];
  defaultOpening: string; // non-nullable
  defaultClosing: string; // non-nullable
  createdAt: string;
  updatedAt: string;
  // Optional: related data
  organization?: Organization;
  catalogProgram?: ProgramCatalog;
}
```

## Persistence Implementation Guidance

1. **Use Application-Specific Types**: Don't use raw Supabase database types directly in application code
2. **Handle Nullability Gracefully**: When reading from DB, handle potential nulls according to business rules
3. **Implement Proper Relationships**: Use existing FKs to fetch related data (JOINs in queries)
4. **Consider Adding Constraints**: Improve data integrity with NOT NULL and CHECK constraints
5. **Review RLS Policies**: Ensure appropriate access controls for all tables based on user roles
6. **Use Stored Procedures**: Expand on patterns like `tm_private.contract_program_for_user` for complex operations

## Specific Recommended Schema Adjustments

```sql
-- Make required fields NOT NULL
ALTER TABLE public.programs
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN host SET NOT NULL,
  ALTER COLUMN editorial_style SET NOT NULL,
  ALTER COLUMN scenario SET NOT NULL,
  ALTER COLUMN default_opening SET NOT NULL,
  ALTER COLUMN default_closing SET NOT NULL;

ALTER TABLE public.episodes
  ALTER COLUMN episode_number SET NOT NULL,
  ALTER COLUMN idea SET NOT NULL,
  ALTER COLUMN host SET NOT NULL,
  ALTER COLUMN diagnosis SET NOT NULL,
  ALTER COLUMN research SET NOT NULL,
  ALTER COLUMN technical_checklist SET NOT NULL;

ALTER TABLE public.participants
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN company SET NOT NULL,
  ALTER COLUMN bio SET NOT NULL,
  ALTER COLUMN contacts SET NOT NULL,
  ALTER COLUMN notes SET NOT NULL;

-- Fix participants.previous_episodes type mismatch
ALTER TABLE public.participants
  ALTER COLUMN previous_episodes TYPE text[] USING ARRAY[previous_episodes]::text[];

-- Add missing foreign key for episode host
ALTER TABLE public.episodes
  ADD CONSTRAINT episodes_host_fkey FOREIGN KEY (host) REFERENCES participants(id);

-- Add enum constraints (example for program format)
ALTER TABLE public.programs
  ADD CONSTRAINT programs_format_check
  CHECK (format IN ('Entrevista', 'Programa Solo', 'Mesa Redonda', 'Podcast/Videocast', 'Debate', 'Reportagem', 'Especial', 'Outro'));

-- Similar checks for other enum-like fields...
```

## Conclusion

The Supabase schema has a strong foundation with most core tables already present.
With targeted adjustments to fix nullability mismatches, correct type inconsistencies,
add missing relationships and constraints, and enhance RLS policies,
the schema will be well-aligned with the TakeMaster-v2 application requirements.

Generated on: Wed Sep 30 2026
