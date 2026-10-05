# TakeMaster V2 — Arquitetura

## 1. Fluxo de dados

```
Frontend
   ↓
API / Application
   ↓
Domain / Contracts
   ↓
Supabase PostgreSQL
   ↓
NVIDIA NIM (quando houver geração de IA)
```

A persistência operacional passa por `src/server/persistence.ts`.

Não adicionar outro banco ou adapter paralelo.

## 2. Hierarquia

```
Organization
  └── Program
       └── Production / Season
            └── Episode
                 ├── Participants
                 ├── Editorial content
                 ├── Script versions
                 ├── Cameras / recording data
                 ├── Schedule
                 └── Library assets
```

Vocabulário de compatibilidade:

- Show ↔ Program
- Production ↔ Season
- Guest ↔ Participant

Esses mapeamentos existem para preservar contratos existentes e não devem gerar entidades duplicadas.

## 3. Editorial

```
Program
  ├── Program Knowledge
  ├── Editorial Identity
  └── Pauta suggestions
          ↓
       Episode
```

A knowledge base é fonte de contexto. A identidade editorial é uma interpretação estruturada desse contexto. Pautas são sugestões contextualizadas.

## 4. Persistência

Supabase é a fonte de verdade.

As funções de persistência devem:

- validar organização e programa;
- resolver UUIDs internos;
- preservar IDs legados somente na borda;
- validar relações antes de escrever;
- nunca substituir falha de banco por dados fake.

## 5. IA

Provider único:

```
NVIDIA NIM
 ├── Nemotron Super 3 — primary
 └── Nemotron Ultra — fallback
```

Regras:

- chamadas somente no backend;
- JSON estrito;
- validação runtime;
- timeout/retry/fallback;
- persistência da geração quando aplicável;
- nenhuma dependência Gemini.

## 6. Frontend

O frontend deve consumir os contratos existentes através de `src/services/api.ts`.

Não criar um segundo fluxo de edição para uma mesma entidade.

Estados de loading, vazio, erro, salvando e salvo devem refletir o estado real da API.

## 7. Segurança

Contexto mínimo:

```
userId
organizationId
role
program access
```

Endpoints não devem autorizar recursos somente porque o cliente conhece o ID.

RLS e autorização do backend devem trabalhar em conjunto.

## 8. Princípios

1. Uma fonte de verdade.
2. Um contrato por conceito.
3. Compatibilidade somente na borda.
4. Persistência real antes de novas features.
5. IA não substitui regras de negócio.
6. Não adicionar arquitetura sem necessidade comprovada.
