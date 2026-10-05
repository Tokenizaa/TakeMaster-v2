# TakeMaster V2 — Estado Canônico

Este arquivo mantém o nome histórico por compatibilidade. A referência canônica é `docs/CANONICAL_STATE.md`.

## Resumo

- Supabase/PostgreSQL é a fonte de verdade.
- NVIDIA NIM é o provider de IA.
- Produção/Temporada permanece entre Programa e Episódio.
- Editorial: Programa → Conhecimento → Identidade → Pautas → Episódio.
- Não usar SQLite, `db.json`, Gemini ou fallback de dados fictícios.
- Contratos existentes devem ser preservados.

## Estado validado

- `npm run lint`: PASS.
- `npm test`: PASS — 4/4.
- `npm run build`: PASS.

## Próximo trabalho

P0: auditoria frontend/API.

P1: crosswalk RS Play + fluxo editorial.

P2: E2E completo e estados de UI.

Para detalhes, consultar `docs/CANONICAL_STATE.md` e `docs/ROADMAP.md`.
