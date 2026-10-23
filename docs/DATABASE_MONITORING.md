# 📊 Monitoramento de Performance do Banco de Dados

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** SRE + Database Reliability Engineer (DBRE)  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Detectar precocemente degradação de performance do banco Supabase/PostgreSQL e garantir SLOs de resposta em produção.

---

## 2. MÉTRICAS ESSENCIAIS

| Métrica | Alerta Warning | Alerta Critical | Fonte |
|---------|---------------|-----------------|-------|
| Query duration p95 | > 200ms | > 500ms | pg_stat_statements |
| Lock wait time | > 1s | > 5s | pg_stat_activity |
| Replication lag | > 5s | > 30s | pg_stat_replication |
| Conexões ativas | > 60% do pool | > 80% do pool | pg_stat_activity |
| Buffer hit ratio | < 95% | < 90% | pg_statio_user_tables |
| Dead tuples | > 100k | > 500k | pg_stat_user_tables |
| Disk usage | > 70% | > 85% | Supabase metrics |

---

## 3. IMPLEMENTAÇÃO

### 3.1 Habilitar pg_stat_statements

```sql
-- No Supabase, verificar se a extensão está disponível
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### 3.2 Health endpoint expandido

O endpoint `/api/health` já verifica conectividade. Expandir para incluir métricas de banco:

```typescript
// Exemplo de expansão do health check
app.get('/api/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  // Adicionar: query duration, conexões ativas, replication lag
  res.json({ ... });
});
```

### 3.3 Dashboards

Criar dashboard com:
- Tempo de resposta de queries (p50, p95, p99)
- Número de conexões ativas vs pool size
- Replication lag
- Lock waits
- Disk usage

---

## 4. ALERTAS SUGERIDOS

### 4.1 Query lenta
```
query_duration_p95 > 200ms por 5 min -> Warning
query_duration_p95 > 500ms por 5 min -> Critical
```

### 4.2 Exaustão de conexões
```
active_connections / max_connections > 0.6 -> Warning
active_connections / max_connections > 0.8 -> Critical
```

### 4.3 Replication lag
```
replication_lag > 5s -> Warning
replication_lag > 30s -> Critical
```

---

## 5. ROTINA DE REVISÃO

| Frequência | Ação | Responsável |
|-----------|------|-------------|
| Diário | Revisar queries mais lentas (pg_stat_statements) | DBRE |
| Semanal | Revisar alertas e ajustar limites | SRE |
| Mensal | Capacidade de crescimento (storage, IOPS, conexões) | DBRE + FinOps |

---

## 6. REFERÊNCIA

- `docs/BACKUP_PITR_DR_RUNBOOK.md` — Backup, PITR e DR
- `docs/ZERO_DOWNTIME_MIGRATIONS.md` — Migrations seguras
- `docs/CONNECTION_POOLING.md` — Connection pooling
