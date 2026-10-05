# TakeMaster V2 — Operações

Este arquivo mantém o nome histórico por compatibilidade, mas seu conteúdo é a referência operacional atual.

## Ambiente

Variáveis essenciais:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `NIM_BASE_URL`
- `NIM_API_KEY`
- `NIM_PRIMARY_MODEL`
- `NIM_FALLBACK_MODEL`
- `NIM_TIMEOUT_MS`
- `INTERNAL_SESSION_KEY`
- `PORT`

Segredos permanecem somente no ambiente server-side.

## Validação

```bash
npm run lint
npm test
npm run build
```

## Banco

Supabase/PostgreSQL é a única fonte de verdade. Migrações ficam em `supabase/migrations/`.

Não usar SQLite, `data/db.json`, fixtures ou seeds como fallback de produção.

## Saúde

`GET /api/health` deve confirmar conectividade da persistência e configuração necessária da IA.

## Segurança

- Não commitar `.env`.
- Não expor service role key no frontend.
- Não criar credenciais padrão.
- Validar Bearer token nas rotas protegidas.
- Respeitar isolamento de organização/programa.
- Não alterar funções SECURITY DEFINER/RLS de forma especulativa.

## IA

NVIDIA NIM somente no backend:

- Super 3: primário.
- Ultra: fallback.
- JSON inválido: erro explícito.
- Gerações relevantes: `ai_generations`.

## Release

Antes de considerar uma alteração pronta:

1. lint;
2. testes;
3. build;
4. revisar diff;
5. confirmar ausência de SQLite, JSON DB, Gemini e mocks de produção;
6. registrar evidência.

## Known issue não bloqueador

O bundle JavaScript principal está acima do limite de 500 kB do Vite. Não iniciar otimização enquanto P0/P1 funcional estiver pendente.
