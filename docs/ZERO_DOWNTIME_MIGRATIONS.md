# 🔄 Zero-Downtime Online Schema Migrations

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Database Reliability Engineer (DBRE)  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Garantir que alterações de schema no banco de dados Supabase/PostgreSQL não causem indisponibilidade da aplicação em produção.

---

## 2. PRINCÍPIOS GERAIS

### 2.1 Nunca travar tabelas ativas

- Usar `lock_timeout` curto (ex: 1 segundo) em todas as migrations
- Usar `statement_timeout` limitado
- Evitar `ALTER TABLE` com `ACCESS EXCLUSIVE lock` em tabelas grandes
- Nunca usar `SET lock_timeout = 0` (espera indefinidamente)

### 2.2 Padrão Expand-Contract

Para mudanças de coluna (renomear, alterar tipo, remover):

1. **Expand:** Adicionar nova coluna ao lado da antiga
2. **Migrate:** Copiar dados da antiga para a nova (em lotes pequenos)
3. **Coexist:** Código lê/escreve em ambas durante período de transição
4. **Contract:** Remover coluna antiga após confirmação

### 2.3 Índices

- Usar `CREATE INDEX CONCURRENTLY` (não bloqueia leitura/escrita)
- Nunca criar índice em transação (CONCURRENTLY não pode estar em bloco transactional)

### 2.4 Backfill em lotes

Para popular dados em nova coluna/tabela:

- Processar em lotes pequenos (ex: 1000 linhas por lote)
- Commit a cada lote
- Intervalo entre lotes para não saturar CPU/IO

---

## 3. REGRAS PARA MIGRATIONS

Cada migration SQL no repositório deve:

| Regra | Detalhe |
|-------|---------|
| `lock_timeout` | Definir `SET lock_timeout = '1s';` no topo |
| `statement_timeout` | Definir `SET statement_timeout = '30s';` no topo |
| Sem `SET lock_timeout = 0` | Proibido — causa espera indefinida |
| `CREATE INDEX CONCURRENTLY` | Para novos índices em tabelas ativas |
| Sem ALTER TABLE com NOT NULL em tabela grande | Usar expand-contract |
| Testar em homologação | Obrigatório antes de produção |
| Reversível | Cada migration deve ter plano de rollback |

---

## 4. EXEMPLO DE MIGRATION SEGURA

```sql
-- 000X_add_column_safely.sql
SET lock_timeout = '1s';
SET statement_timeout = '30s';
SET idle_in_transaction_session_timeout = '60s';

-- Expand: adicionar coluna nova (nullable)
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS new_field text;

-- Backfill em lotes (executado por script separado, não na migration)
-- UPDATE public.episodes SET new_field = ... WHERE id IN (SELECT id FROM ... LIMIT 1000);

-- Contract: após código atualizado para usar new_field, remover antiga
-- ALTER TABLE public.episodes DROP COLUMN IF EXISTS old_field;
```

---

## 5. CHECKLIST ANTES DE APLICAR EM PRODUÇÃO

- [ ] Migration testada em banco de homologação com carga simulada
- [ ] `lock_timeout` e `statement_timeout` definidos
- [ ] Índices criados com `CONCURRENTLY`
- [ ] Plano de rollback documentado
- [ ] Backup válido antes da aplicação
- [ ] Janela de manutenção comunicada (se aplicável)
- [ ] Monitoramento de performance ativo durante a aplicação

---

## 6. REFERÊNCIA

- `docs/BACKUP_PITR_DR_RUNBOOK.md` — Backup, PITR e DR
- `supabase/migrations/` — Migrations versionadas
