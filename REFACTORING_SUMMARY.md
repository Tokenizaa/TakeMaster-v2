# Refactoring Summary: Show → Program Nomenclature

## Overview
This refactoring updated all references from "show" to "program" throughout the TakeMaster v2 codebase to align with the canonical vocabulary established in Fase 0.2 of the roadmap.

## Changes Made

### 1. Types and Interfaces
- **src/types/domain.ts**: 
  - Renamed `Show` interface to `Program`
  - Updated `DatabaseState.shows: Show[]` to `DatabaseState.programs: Program[]`
  - Renamed `Episode.showId` to `Episode.programId`
- **src/types/index.ts**:
  - Renamed `Show` interface to `Program`
  - Updated `DatabaseState.shows: Show[]` to `DatabaseState.programs: Program[]`
  - Renamed `Episode.showId` to `Episode.programId`

### 2. Service Layer
- Renamed directory: `src/services/shows` → `src/services/programs`
- Updated `src/services/programs/programs.service.ts` and `.js`:
  - Renamed `ShowsService` to `ProgramsService`
  - Updated method names: `getShows` → `getPrograms`, `getShowById` → `getProgramById`, `createShow` → `createProgram`, `updateShow` → `updateProgram`, `deleteShow` → `deleteProgram`
  - Updated imports and all internal references
- Updated `src/services/shows/shows.service.js` → `src/services/programs/programs.service.js`

### 3. Validation Layer
- Renamed `src/validation/shows.validators.ts` → `src/validation/programs.validators.ts`:
  - Renamed validation functions: `validateShow` → `validateProgram`, `validateShowCreation` → `validateProgramCreation`, `validateShowUpdate` → `validateProgramUpdate`
  - Updated imports and all references

### 4. Persistence Layer
- Updated `src/server/supabasePersistence.ts`:
  - Renamed methods: `getShows` → `getPrograms`, `getShow` → `getProgram`, `saveShow` → `saveProgram`, `deleteShow` → `deleteProgram`
  - Updated return types and parameter types
  - Updated internal variable names and comments

### 5. API Service
- Updated `src/services/api.ts`:
  - Updated imports to use `Program` type (via `../types`)
  - Renamed API endpoint methods: `getShows` → `getPrograms`, `getShow` → `getProgram`, `createShow` → `createProgram`, `updateShow` → `updateProgram`, `deleteShow` → `deleteProgram`
  - Updated endpoint URLs: `/api/shows` → `/api/programs`
  - Updated error messages

### 6. Server Routes
- Updated `server.ts`:
  - Updated imports and service instantiation
  - Rewrote shows REST endpoints as programs REST endpoints using the service class
  - Updated all service method calls, validation function calls, and error messages

### 7. Frontend Components
- Renamed `src/components/ShowsView.tsx` → `src/components/ProgramsView.tsx`:
  - Renamed component from `ShowsView` to `ProgramsView`
  - Updated imports, props, state variables, and event handlers
  - Updated JSX references and labels
- Updated `src/App.tsx`:
  - Updated imports and state variables
  - Updated data loading and handler functions
  - Updated view routing and component props
  - Fixed syntax errors (missing quotes in imports)
- Updated `src/components/NewEpisodeModal.tsx`:
  - Updated imports and types to use `Program` terminology
  - Updated `onCreateWithAi` parameter from `showId` to `programId`

### 8. Other Files
- Updated `src/test.service.js` to reflect new directory structure

## Verification
- TypeScript compilation passes (excluding test and temporary files)
- All core functionality updated to use "program" terminology
- Database table remains correctly named as `public.programs` (no schema changes needed)

## Notes
- Some backward compatibility considerations were made in prop names where changing them would require extensive downstream updates
- The refactor focused on updating terminology while preserving functionality
- Test files and temporary files may require separate updates