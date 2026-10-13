# Auditoria de schema: runtime versus migrations

Data: 2026-10-13

## Resultado

**Status: bloqueador P0.** O backend em `src/server/persistence.ts` não é reproduzível a partir das migrations atualmente versionadas.

## Evidência local

O runtime consulta principalmente:

- `programs`;
- `seasons`;
- `agenda_events`;
- `ai_generations`;
- `program_user_access`;
- tabelas filhas editoriais como `questions`, `segments`, `script_items`, `planned_shorts`, `recording_markers` e `episode_versions`.

As migrations versionadas criam, entre outras:

- `shows` e `productions` em `0001_v2_core_schema.sql`;
- `schedule_events` em `0002_v2_operations_and_rls.sql`;
- `user_show_permissions`, `saas_subscriptions`, `billing_invoices` e `payment_gateway_events` em `0003_v2_rsplay_saas_rbac_billing.sql`.

Também há divergências de nomenclatura e relacionamento, por exemplo:

- runtime: `program_id` e `seasons.program_id`;
- migration 0001: `show_id` e `productions.show_id`;
- runtime: `agenda_events.scheduled_date/scheduled_time`;
- migration 0002: `schedule_events.scheduled_start/scheduled_end`.

## Decisão operacional

Não aplicar as migrations atuais em produção nem criar uma migration de conversão por inferência. Primeiro é necessário obter o schema efetivo do projeto Supabase canônico e construir um crosswalk aprovado.

## Próxima ação obrigatória

1. Exportar o schema do projeto canônico, sem dados sensíveis.
2. Comparar tabelas, colunas, chaves, índices, RLS e funções com o runtime.
3. Marcar cada entidade como `canônica`, `legada`, `ausente` ou `duplicada`.
4. Definir uma única fonte de verdade.
5. Criar migrations incrementais e reversíveis para ambientes novos e existentes.
6. Reexecutar os testes CRUD e de isolamento em um banco de homologação.

## Regra de segurança

Até a conclusão desse crosswalk, alterações de schema devem ser somente leitura/auditoria. Nenhuma tabela deve ser renomeada, removida ou duplicada para “fazer o teste passar”.

