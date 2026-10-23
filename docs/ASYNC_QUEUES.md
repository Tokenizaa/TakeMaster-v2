# 🔄 Filas Assíncronas e Processamento em Background

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Backend Architect  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Mover operações síncronas bloqueantes para filas assíncronas, melhorando a responsividade da API e permitindo processamento de longa duração (IA, geração de roteiro, processamento de mídia) sem travar requisições HTTP.

---

## 2. PROBLEMA ATUAL

Todas as operações de IA (`/api/ai/*`) e processamento são síncronas — o Worker bloqueia até a conclusão. Isso causa:

- Timeouts de requisição para operações longas
- Má utilização de recursos (Worker ocupado aguardando IA)
- Má experiência do usuário (tela travada)

---

## 3. SOLUÇÃO: FILAS ASSÍNCRONAS

### 3.1 Tecnologia: BullMQ + Redis

Usar BullMQ (ou equivalente) com Redis para gerenciamento de filas:

```
Arquitetura:
  Cliente HTTP → API → Enqueue job → Resposta imediata (202 Accepted)
  Worker separado → Consome fila → Processa → Atualiza status → Notifica via WebSocket/push
```

### 3.2 Filas Sugeridas

| Fila | Tipo de Job | Prioridade | Timeout |
|------|-------------|------------|---------|
| `ai-generation` | Diagnóstico, pesquisa, roteiro, shorts | Alta | 300s |
| `media-processing` | Processamento de vídeo, áudio, imagens | Média | 600s |
| `billing-renewal` | Renovação automática de assinaturas | Baixa | 120s |
| `notifications` | E-mail, WhatsApp, push | Baixa | 30s |
| `data-export` | Exportação de dados do usuário (DSAR) | Baixa | 300s |

### 3.3 Fluxo de Job

1. API recebe requisição → valida → enqueue → retorna `202 Accepted` com `jobId`
2. Cliente consulta status: `GET /api/v1/jobs/:jobId`
3. Worker processa → atualiza status no banco
4. Cliente recebe notificação (WebSocket/SSE) quando concluído

### 3.4 Exemplo de Implementação

```typescript
// Enqueue no endpoint
app.post('/api/v1/ai/diagnosis', requireAuth, async (req, res) => {
  const job = await aiQueue.add('diagnosis', { episodeId, context }, { priority: 1 });
  res.status(202).json({ jobId: job.id, status: 'queued' });
});

// Consulta de status
app.get('/api/v1/jobs/:jobId', requireAuth, async (req, res) => {
  const job = await aiQueue.getJob(req.params.jobId);
  res.json({ jobId: job.id, status: await job.getState(), result: job.returnvalue });
});
```

---

## 4. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Instalar e configurar Redis (ou usar Redis gerenciado)
- [ ] Instalar BullMQ (`bun add bullmq ioredis`)
- [ ] Criar filas: ai-generation, media-processing, billing-renewal, notifications, data-export
- [ ] Implementar worker separado para consumir filas
- [ ] Adicionar endpoint `POST /api/v1/ai/*` que enqueue e retorna 202
- [ ] Adicionar endpoint `GET /api/v1/jobs/:id` para consulta de status
- [ ] Implementar retry automático para jobs falhados
- [ ] Adicionar dead-letter queue para jobs que falham repetidamente
- [ ] Monitorar filas (tamanho, tempo de processamento, taxa de erro)

---

## 5. REFERÊNCIA

- BullMQ: https://docs.bullmq.io/
- Redis: https://redis.io/
