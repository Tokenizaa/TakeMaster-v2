# 🗄️ Runbook: Backup, PITR e Recuperação de Desastre (Supabase)

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Banco:** Supabase/PostgreSQL — Projeto `cvyoumtywnyayceoezru`  
**Versão:** 1.0  
**Data:** 22 Out 2026  
**Responsável:** Database Reliability Engineer (DBRE)

---

## 1. OBJETIVO

Definir procedimentos de backup automatizado, Point-in-Time Recovery (PITR), alta disponibilidade (HA), failover automatizado e disaster recovery (DR) para o banco de dados Supabase em produção.

---

## 2. METAS DE RECUPERAÇÃO (RTO/RPO)

| Métrica | Valor Alvo | Justificativa |
|---------|-----------|---------------|
| **RPO** (Recovery Point Objective) | ≤ 1 minuto | PITR com arquivamento contínuo de WAL |
| **RTO** (Recovery Time Objective) | ≤ 30 minutos | Restore + failover automatizado |
| **Retenção de backup full** | 35 dias | Conformidade operacional |
| **Retenção de WAL/PITR** | 7 dias | Recuperação granular a qualquer ponto |

> ⚠️ **Esses valores devem ser assinados pelo negócio (Product Manager) antes do go-live.**

---

## 3. BACKUP AUTOMATIZADO (Supabase)

### 3.1 Configuração no painel Supabase

1. Acessar o painel do Supabase: https://app.supabase.com/project/cvyoumtywnyayceoezru
2. Ir em **Settings → Database → Backups**
3. Habilitar **Point-in-Time Recovery (PITR)**
4. Definir retenção de backup: mínimo 35 dias (full) + WAL contínuo (7 dias)
5. Habilitar **cópia cross-region** (DR): configurar região secundária para replicação de backup
6. Verificar se o plano contratado inclui backup automático diário (plano Pro ou superior)

### 3.2 Verificação de backup

Executar semanalmente (job automatizado):

```bash
# Verificar último backup disponível
supabase backup list --project-ref cvyoumtywnyayceoezru

# Verificar status do PITR
supabase status --project-ref cvyoumtywnyayceoezru
```

---

## 4. TESTE DE RESTORE (DR Drill)

### 4.1 Procedimento de restore em instância descartável

1. Criar projeto Supabase temporário para homologação
2. Restaurar o último backup full
3. Replay do WAL até o ponto desejado (PITR)
4. Executar smoke queries contra tabelas principais:
   - `SELECT count(*) FROM programs;`
   - `SELECT count(*) FROM seasons;`
   - `SELECT count(*) FROM agenda_events;`
   - `SELECT count(*) FROM ai_generations;`
5. Medir tempo total de restore (deve ser ≤ RTO de 30 min)
6. Se bem-sucedido, descartar a instância temporária
7. Registrar o resultado no tracker de DR

### 4.2 Frequência

- **Mensal:** Teste completo de restore + PITR
- **Após cada alteração de schema:** Teste de restore em homologação

---

## 5. ALTA DISPONIBILIDADE (HA) E FAILOVER

### 5.1 Confirmação com o Supabase

- Confirmar com o Supabase se o plano contratado inclui **réplica síncrona** nativa (HA)
- Confirmar se há **failover automático** de banco em caso de falha de nó primário
- Confirmar se há **endpoint estável** de conexão (não endereço de nó fixo)

### 5.2 Se o plano não incluir HA nativa

1. Provisionar réplica síncrona em outra Availability Zone (AZ)
2. Configurar connection pooler (PgBouncer ou equivalente gerenciado pelo Supabase) com endpoint estável
3. Configurar fencing do primário falhado para evitar split-brain
4. Drillar failover mensalmente

---

## 6. DR RUNBOOK (Cenários de Recuperação)

### Cenário A: Perda do nó primário do banco

1. Detectar falha via monitoramento (health endpoint `/api/health`)
2. Acionar failover automático (se configurado) ou manual
3. Repointar a aplicação para o endpoint de failover
4. Verificar conectividade: `GET /api/health`
5. Validar integridade: smoke queries nas tabelas principais
6. Notificar stakeholders

### Cenário B: Perda de região inteira

1. Ativar região secundária (DR)
2. Restaurar backup cross-region na região secundária
3. Replay WAL até o ponto mais recente possível (RPO ≤ 1 min)
4. Repointar DNS/load balancer para a região secundária
5. Validar aplicação completa
6. Iniciar failback quando a região primária estiver restaurada

### Cenário C: Corrupção lógica (exclusão acidental, dados corrompidos)

1. Identificar o ponto no tempo antes da corrupção
2. Executar PITR até esse timestamp em instância descartável
3. Validar dados restaurados
4. Se confirmado, restaurar na produção ou recuperar apenas os dados afetados
5. Registrar pós-mortem

---

## 7. MIGRAÇÕES E ZERO-DOWNTIME

### 7.1 Regras para migrations em produção

- Usar `lock_timeout` curto (ex: 1 segundo) em todas as migrations
- Usar `statement_timeout` limitado
- Padrão expand-contract para mudanças de coluna
- `CREATE INDEX CONCURRENTLY` para índices novos
- Backfill em lotes pequenos com commit a cada lote
- Testar cada migration em banco de homologação com carga simulada antes de produção

### 7.2 Migrações atuais no repositório

| Migration | Status | Nota |
|-----------|--------|------|
| `supabase/migrations/20261013170000_canonical_schema_baseline.sql` | ✅ Ativa | Baseline do schema canônico |
| `supabase/migrations/20261013183000_verify_canonical_runtime_schema.sql` | ✅ Ativa | Verificação não destrutiva |
| `supabase/legacy-migrations/0001_v2_core_schema.sql` | ⚠️ Legado | Modelo divergente (`shows`, `productions`) |
| `supabase/legacy-migrations/0002_v2_operations_and_rls.sql` | ⚠️ Legado | Modelo divergente (`schedule_events`) |
| `supabase/legacy-migrations/0003_v2_rsplay_saas_rbac_billing.sql` | ⚠️ Legado | Modelo divergente |
| `supabase/legacy-migrations/20261004050000_revoke_anon_execute_security_definers.sql` | ⚠️ Legado | Apenas revogação |

> ⚠️ **Não aplicar as migrations legacy em produção.** Elas devem ser tratadas como histórico divergente.

---

## 8. CRIPTOGRAFIA E SEGREDO

### 8.1 Criptografia em repouso

- Confirmar com o Supabase se o disco está criptografado (TDE ou equivalente)
- Verificar se backups são criptografados com chaves gerenciadas

### 8.2 Rotação de secrets

- Rotacionar `SUPABASE_SERVICE_ROLE_KEY` regularmente (mínimo a cada 90 dias)
- Gerenciar secrets via Cloudflare Secrets (não versionados no git)
- Nunca commitar `.env` com valores reais

---

## 9. CHECKLIST DE PRONTIDÃO (antes do go-live)

- [ ] Backup automático diário configurado no Supabase
- [ ] PITR habilitado com retenção de WAL ≥ 7 dias
- [ ] Cópia cross-region de backup configurada
- [ ] RTO/RPO definidos e assinados pelo negócio
- [ ] Teste de restore executado com sucesso em homologação
- [ ] DR runbook documentado e revisado
- [ ] HA e failover automatizado confirmados com o Supabase
- [ ] Drill de failover executado mensalmente
- [ ] Zero-downtime migration rules documentadas e treinadas
- [ ] Criptografia em repouso confirmada com o Supabase
- [ ] Plano de rotação de `SUPABASE_SERVICE_ROLE_KEY` definido

---

## 10. CONTATOS DE ESCALONAMENTO

| Função | Responsável | Contato |
|--------|-------------|---------|
| DBRE (líder da Área 5) | database-reliability-engineer | — |
| Incident Commander | incident-response-commander | — |
| Product Manager | product-manager | — |
| Supabase Support | — | Via painel Supabase |

---

**Próxima revisão:** Após execução das ações de Prioridade 1 e novo drill de restore/failover.
