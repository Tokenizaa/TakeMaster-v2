# 🔌 Connection Pooling e Limites por Serviço

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Database Reliability Engineer (DBRE)  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Evitar exaustão de conexões do banco de dados Supabase/PostgreSQL sob carga, garantindo estabilidade da aplicação em produção.

---

## 2. PROBLEMA ATUAL

O `src/server/persistence.ts` cria um `SupabaseClient` singleton com `SUPABASE_SERVICE_ROLE_KEY`, conectando diretamente ao banco sem pool visível. Isso expõe a aplicação a:

- Exaustão de conexões sob carga
- Connection leaks (conexões não fechadas)
- Sem métrica de utilização de conexões

---

## 3. SOLUÇÃO: CONNECTION POOLING

### 3.1 PgBouncer (ou pooler gerenciado pelo Supabase)

Instalar e configurar PgBouncer entre a aplicação e o Supabase:

```
[databases]
takemaster = host=db.prod.supabase.co port=5432 dbname=postgres auth_user=postgres

[pgbouncer]
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
```

### 3.2 Configuração da aplicação

A aplicação deve se conectar ao pooler (não diretamente ao banco):

```typescript
// src/server/persistence.ts
const POOL_MAX = 25;
const POOL_TIMEOUT = 5000; // ms

const db = createClient(POOLER_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  // connection pooling via Supabase pooler endpoint
});
```

### 3.3 Limites por serviço/tenant

| Serviço | Pool Size | Timeout | Uso |
|---------|-----------|---------|-----|
| API principal | 20 conexões | 5s | Requisições HTTP |
| Background jobs | 5 conexões | 10s | Processamento assíncrono |
| Relatórios/BI | 5 conexões | 30s | Consultas pesadas |

---

## 4. MONITORAMENTO DE CONEXÕES

Métricas a serem coletadas:

- `pg_stat_activity` — conexões ativas, idle, waiting
- `pg_pool_stat` (PgBouncer) — pool utilization
- Alerta quando conexões ativas > 80% do limite

Alerta sugerido:
```
if (active_connections > pool_max * 0.8) -> critical
if (active_connections > pool_max * 0.6) -> warning
```

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Configurar PgBouncer (ou confirmar pooler gerenciado pelo Supabase)
- [ ] Atualizar connection string da aplicação para usar pooler
- [ ] Definir pool size por serviço/tenant
- [ ] Adicionar métrica de conexões ativas ao `/api/metrics`
- [ ] Configurar alerta de exaustão de conexões
- [ ] Testar sob carga para validar limites

---

## 6. REFERÊNCIA

- `docs/BACKUP_PITR_DR_RUNBOOK.md` — Backup, PITR e DR
- `docs/ZERO_DOWNTIME_MIGRATIONS.md` — Migrations seguras
