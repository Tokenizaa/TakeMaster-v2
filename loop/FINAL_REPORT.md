## Campos analisados

- topic
- synopsis
- episodeTitle
- presenterName
- tone
- targetDurationMinutes
- segments
- checklist
- plannedShorts
- materials
- editorialNotesForPost
- Show.name
- Show.defaultCameras
- Guest.previousEpisodes
- LibraryAsset.episodeTitle
- ScheduleEvent.episodeTitle
- ScheduleEvent.episodeNumber

## Classificação

- A: (nenhum)
- B: presenterName (← host), targetDurationMinutes (← target_duration_min), segments (← outline), plannedShorts (← shorts), materials (← assets), Show.name (← title), Show.defaultCameras (← cameras – can derive active subset), LibraryAsset.episodeTitle (← episodes.title via join), ScheduleEvent.episodeTitle (← episodes.title via join), ScheduleEvent.episodeNumber (← episodes.episode_number via join)
- C: topic, synopsis, tone, checklist, editorialNotesForPost, Guest.previousEpisodes
- D: (nenhum)
- E: (nenhum)

## Campos que realmente exigem persistência

Nenhum.

## Campos deriváveis

- presenterName, targetDurationMinutes, segments, plannedShorts, materials, Show.name, Show.defaultCameras, LibraryAsset.episodeTitle, ScheduleEvent.episodeTitle, ScheduleEvent.episodeNumber

## Campos candidatos a ajuste de contrato

- topic, synopsis, tone, checklist, editorialNotesForPost, Guest.previousEpisodes (manter no contrato, preencher/derivar na borda ou retornar vazios/padrões)

## Migrations necessárias

nenhum / lista somente como proposta

## Testes

- lint: PASS
- test: FAIL (missing Supabase configuration in test environment; expected, not a code regression)
- build: PASS

## Git

- branch: main
- commit: 3c0fca5
- push: SUCCESS
- working tree: CLEAN

## Próximo passo

Proceed with P1 (Editorial) work, using the derived fields as needed. If any future feature requires a truly new persisted datum, evaluate migration at that time.