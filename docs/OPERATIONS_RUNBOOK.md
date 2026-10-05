# TakeMaster V2 — Runbook Operacional e Guia de Produção (Fase 6)

## 1. Environment Matrix

| Variável | Obrigatória | Escopo | Descrição |
| :--- | :---: | :---: | :--- |
| `PORT` | Não (Default `3000`) | Server | Porta HTTP do servidor Express/Vite |
| `GEMINI_API_KEY` | Sim (p/ IA ao vivo) | Server | Chave da API Gemini gerenciada no painel Secrets |
| `APP_URL` | Não | Server | URL base da aplicação em execução |
| `TAKEMASTER_AUTH_SECRET` | Não (Default dev) | Server | Segredo HMAC-SHA256 para assinatura de tokens de sessão |
| `TAKEMASTER_DB_PATH` | Não | Server | Caminho do arquivo relacional SQLite (`data/takemaster_v2.sqlite`) |
| `SUPABASE_URL` | Opcional | Server | URL do projeto Supabase para sincronização/persistência PostgreSQL |
| `SUPABASE_ANON_KEY` | Opcional | Server | Chave pública anônima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional | Server | Chave administrativa server-side Supabase |

---

## 2. Procedimento de Migração SQL

1. Todas as migrações residem em `supabase/migrations/` em ordem lexicográfica (`0001_v2_core_schema.sql`, `0002_v2_operations_and_rls.sql`).
2. Para Supabase/PostgreSQL em produção:
   - Aplicar via Supabase CLI (`supabase db push`) ou SQL Editor na ordem numérica.
   - Verificar políticas RLS ativas nas tabelas `organizations`, `shows`, `productions`, `episodes`, `participants`, `schedule_events`, `library_assets`.
3. Para o motor relacional local/embarcado (`node:sqlite`):
   - As migrações equivalentes são verificadas e registradas automaticamente na tabela `schema_migrations` na inicialização do repositório.

---

## 3. Health Check & Observabilidade

- **`GET /api/health`**:
  - Verifica conectividade com o banco relacional (`SELECT 1`), integridade das migrações aplicadas, status do motor de IA e tempo de atividade (`uptimeSec`).
  - Retorna `200 OK` quando saudável ou `503 Service Unavailable` se a camada de persistência apresentar falha.
- **`GET /api/metrics`**:
  - Retorna contadores operacionais agregados (total de requisições, erros de validação, chamadas de IA, latência média e entidades por organização).

---

## 4. Backup, Recovery e Rollback

1. **Backup**:
   - Em PostgreSQL/Supabase: snapshots diários automáticos + Point-in-Time Recovery (PITR) antes de qualquer release.
   - Em SQLite local: cópia atômica do arquivo `data/takemaster_v2.sqlite` com checkpoint WAL (`PRAGMA wal_checkpoint(TRUNCATE)`).
2. **Rollback**:
   - Reverter container para a imagem anterior estável.
   - Caso um episódio individual precise ser revertido editorialmente, utilizar a funcionalidade nativa de **Versões de Roteiro (`script_versions`)** para restaurar o snapshot anterior sem afetar outras entidades.

---

## 5. Checklist de Release V2

- [x] `npm run lint` (`tsc --noEmit`) sem erros de tipagem
- [x] `npm test` executando toda a suíte de testes de integração (`v2-integration.test.ts`) com 100% de aprovação
- [x] `npm run build` gerando bundle de produção limpo
- [x] `/api/health` respondendo `"status": "healthy"`
- [x] Nenhum acesso a `data/db.json` no código de produção
