# TakeMaster V2 — Baseline Arquitetural

Este arquivo mantém o nome histórico. A arquitetura atual está em `docs/ARCHITECTURE.md`.

## Hierarquia

```
Organization
  → Program
    → Production / Season
      → Episode
        → Participants / Editorial / Recording / Schedule / Library
```

## Fluxo editorial

```
Program
  → Knowledge
    → Identity
      → Pautas
        → Episode
```

## Persistência

`src/server/persistence.ts` usa Supabase/PostgreSQL como fonte de verdade.

SQLite, `db.json` e adapters paralelos não fazem parte do runtime.

## IA

NVIDIA NIM é o provider exclusivo, com Nemotron Super 3 como primário e Nemotron Ultra como fallback.

## Regra

Consultar `docs/ARCHITECTURE.md` antes de alterar a arquitetura.
