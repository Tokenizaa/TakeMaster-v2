# ⚠️ Migrations Legadas — Deprecated

**Status:** DEPRECADO — Não aplicar em produção  
**Data:** 22 Out 2026  
**Responsável:** Database Reliability Engineer (DBRE)

---

## Motivo

O schema efetivo em runtime (consultado pelo backend) é o schema canônico do Supabase, com as seguintes entidades principais:

- `programs`, `seasons`, `agenda_events`, `ai_generations`
- `program_user_access`, `audit_log`, `organizations`, `organization_members`
- Tabelas filhas editoriais: `questions`, `segments`, `script_items`, `planned_shorts`, `recording_markers`, `episode_versions`

As migrations deste diretório criam um **modelo divergente**:

- `shows` e `produções` (em vez de `programs` e `seasons`)
- `schedule_events` (em vez de `agenda_events`)
- `user_show_permissions` (em vez de `program_user_access`)
- `audit_logs` (em vez de `audit_log`)

Além disso, há divergências de nomenclatura de colunas e relacionamentos (ex: `show_id` vs `program_id`, `scheduled_start/scheduled_end` vs `scheduled_date/scheduled_time`).

---

## Arquivos neste diretório

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| `0001_v2_core_schema.sql` | Core: `organizations`, `users`, `shows`, `productions`, `participants`, etc. | ⚠️ Legado |
| `0002_v2_operations_and_rls.sql` | Operações: `schedule_events`, RLS | ⚠️ Legado |
| `0003_v2_rsplay_saas_rbac_billing.sql` | SaaS/RBAC: `user_show_permissions`, `saas_subscriptions`, etc. | ⚠️ Legado |
| `20261004050000_revoke_anon_execute_security_definers.sql` | Revogação de permissões | ⚠️ Legado |

---

## Migrations Canônicas (fonte da verdade)

As migrations que reproduzem o schema canônico estão em:

- `supabase/migrations/20261013170000_canonical_schema_baseline.sql` — Baseline do schema canônico
- `supabase/migrations/20261013183000_verify_canonical_runtime_schema.sql` — Verificação não destrutiva

---

## Regras operacionais

1. **Não aplicar** as migrations legacy em ambientes de produção ou homologação.
2. Usar apenas as migrations canônicas para criar novos ambientes.
3. Para alterações de schema, criar migrations incrementais e reversíveis com base no schema canônico.
4. Antes de qualquer migration incremental, comparar colunas, índices, RLS e funções contra o schema canônico.
5. Testar migrations em banco de homologação com carga simulada antes de produção.

---

## Referência

- `docs/SCHEMA_RUNTIME_AUDIT.md` — Auditoria detalhada de divergência schema/migration
- `supabase/baseline/canonical-public-schema.sql` — Snapshot somente de schema do projeto remoto
