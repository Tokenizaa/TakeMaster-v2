# TakeMaster V2 — Estado Canônico

> Fonte de verdade do projeto. Quando outro documento divergir deste, este documento prevalece.

## Estado técnico atual

- Persistência: **Supabase/PostgreSQL** no projeto canônico `cvyoumtywnyayceoezru`.
- Backend: API existente + `src/server/persistence.ts`.
- Frontend: contratos existentes preservados.
- IA: **NVIDIA NIM**, exclusivamente server-side.
  - Primário: `nvidia/nemotron-3-super-120b-a12b`
  - Fallback: `nvidia/nemotron-3-ultra-550b-a55b`
- Autenticação: sessão Bearer validada no backend, apoiada pelo Supabase Auth.
- IDs internos: UUID; compatibilidade legada permanece apenas na borda quando necessária.
- Não existe SQLite como runtime de produção.
- `data/db.json` não é fonte de verdade.
- Seeds não são mecanismo de fallback de produção.

## Modelo de produto

```
Plano/Organização
  → Programa
    → Temporada/Produção
      → Episódio
```

Editorial:

```
Programa
  → Conhecimento
    → Identidade
      → Pautas
        → Episódio
```

Productions/Seasons permanecem porque são necessários para gestão de planos, programas e ciclos de produção.

## Catálogo e conhecimento

- `program_catalog` é o catálogo RS Play.
- A operação usa Programas próprios da organização.
- `programs.catalog_program_id` só deve ser preenchido quando o vínculo com o catálogo for verificado.
- A knowledge base RS Play é fonte editorial e deve preservar origem.
- Não importar automaticamente todo o catálogo para a operação.
- Conteúdo ausente na knowledge base deve ser tratado como não identificado; não inventar fatos.

## IA editorial

O fluxo canônico é:

```
Programa → Identidade → Pautas → Episódio
```

As respostas da IA são validadas por contrato antes de chegar à aplicação.

Gerações editoriais devem ser registradas em `ai_generations`.

A IA sugere; a aplicação valida e persiste.

Não criar segundo RAG, segundo editor ou armazenamento paralelo de conhecimento sem necessidade comprovada.

## Segurança

Toda operação de negócio deve respeitar o contexto autenticado:

```
User → Organization → Program → Production → Episode
```

A autorização não deve confiar apenas em IDs enviados pelo cliente.

RLS e isolamento por organização/programa permanecem parte da fundação.

## Validação atual

Última validação técnica conhecida:

- `npm run lint`: **PASS**
- `npm test`: **PASS — 4/4**
- `npm run build`: **PASS**
- Warning conhecido: bundle JavaScript acima de 500 kB. Não é bloqueador e não deve gerar refatoração agora.

## Próximo trabalho

1. Auditar frontend ↔ API real.
2. Eliminar mocks/localStorage/fallbacks apenas onde realmente existirem.
3. Validar o crosswalk Programa ↔ catálogo RS Play ↔ knowledge base.
4. Validar o fluxo Identidade → Pautas → Episódio.
5. Executar E2E real: Login → Programa → Identidade → Pauta → Episódio → Save → Reload.
6. Só depois priorizar novas funcionalidades.

## Regras de continuidade

Não introduzir:

- novo banco;
- SQLite;
- `db.json`;
- Gemini;
- novo RAG;
- segundo editor;
- novos papéis sem necessidade comprovada;
- duplicação de entidades;
- migrações especulativas;
- refatorações de performance fora do escopo atual.

A prioridade é consolidar, testar, corrigir e somente então evoluir.
