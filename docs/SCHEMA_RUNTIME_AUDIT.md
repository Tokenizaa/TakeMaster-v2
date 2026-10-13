# Auditoria de schema: runtime versus migrations

Data: 2026-10-13

## Resultado

**Status: bloqueador P0 de reprodutibilidade.** O backend está alinhado ao schema efetivo do projeto Supabase canônico, mas esse schema não é reproduzível a partir das migrations atualmente versionadas.

## Evidência local

O runtime consulta principalmente:

- `programs`;
- `seasons`;
- `agenda_events`;
- `ai_generations`;
- `program_user_access`;
- tabelas filhas editoriais como `questions`, `segments`, `script_items`, `planned_shorts`, `recording_markers` e `episode_versions`.

O dump somente de schema do projeto canônico confirmou que o runtime encontra as seguintes entidades principais:

- `programs`, `seasons`, `episodes`, `participants`;
- `agenda_events`, `library_assets`, `audit_log`, `ai_generations`;
- `program_user_access`;
- `questions`, `segments`, `script_items`, `planned_shorts`, `recording_markers`, `episode_versions`;
- `organizations`, `organization_members`, `organization_subscriptions` e `program_catalog`.

As migrations versionadas, porém, criam outro modelo:

- `shows` e `productions` em `0001_v2_core_schema.sql`;
- `schedule_events` em `0002_v2_operations_and_rls.sql`;
- `user_show_permissions`, `saas_subscriptions`, `billing_invoices` e `payment_gateway_events` em `0003_v2_rsplay_saas_rbac_billing.sql`.

No schema remoto, `shows`, `productions`, `schedule_events`, `user_show_permissions` e `audit_logs` não existem como tabelas públicas canônicas; os equivalentes são `programs`, `seasons`, `agenda_events`, `program_user_access` e `audit_log`.

Também há divergências de nomenclatura e relacionamento, por exemplo:

- runtime: `program_id` e `seasons.program_id`;
- migration 0001: `show_id` e `productions.show_id`;
- runtime: `agenda_events.scheduled_date/scheduled_time`;
- migration 0002: `schedule_events.scheduled_start/scheduled_end`.

## Resultado do crosswalk remoto

| Área | Runtime | Schema remoto | Migrations versionadas | Situação |
|---|---|---|---|---|
| Programa | `programs` | `programs` | `shows` | runtime alinhado; migration divergente |
| Produção | `seasons` | `seasons` | `productions` | runtime alinhado; migration divergente |
| Agenda | `agenda_events` | `agenda_events` | `schedule_events` | runtime alinhado; migration divergente |
| IA | `ai_generations` | `ai_generations` | ausente | migration incompleta |
| Acesso por programa | `program_user_access` | `program_user_access` | `user_show_permissions` | modelos distintos |
| Auditoria | `audit_log` | `audit_log` | `audit_logs` | nomes e colunas distintos |

O schema remoto também possui FKs entre programas, temporadas, episódios, participantes e entidades editoriais, além de RLS/policies para acesso por organização e programa.

## Decisão operacional

Não aplicar as migrations atuais em produção. Elas devem ser tratadas como histórico divergente até serem substituídas por uma baseline/migrations que reproduzam o schema canônico real.

## Próxima ação obrigatória

1. Preservar o dump remoto de schema como evidência de baseline, sem dados.
2. Gerar uma baseline versionada do schema canônico ou declarar formalmente as migrations atuais como legado.
3. Comparar colunas, índices, RLS e funções antes de gerar qualquer migration incremental.
4. Criar migrations incrementais e reversíveis para ambientes novos e existentes.
5. Reexecutar os testes CRUD e de isolamento em um banco de homologação.

## Regra de segurança

Até a conclusão desse crosswalk, alterações de schema devem ser somente leitura/auditoria. Nenhuma tabela deve ser renomeada, removida ou duplicada para “fazer o teste passar”.

