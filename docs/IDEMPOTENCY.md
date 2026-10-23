# 🔑 Idempotência de Operações

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Backend Architect  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Garantir que operações de escrita repetidas (retry, duplicação acidental) não causem efeitos colaterais indesejados (duplicação de cobrança, criação de registros duplicados, etc.).

---

## 2. PROBLEMA

Operações como `POST /api/v1/billing/subscribe` podem ser reenviadas pelo cliente em caso de timeout de rede, resultando em cobranças duplicadas.

---

## 3. SOLUÇÃO: IDEMPOTENCY-KEY

### 3.1 Header

O cliente envia um header `Idempotency-Key` com um UUID único para cada operação de escrita:

```
POST /api/v1/billing/subscribe
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440001
Content-Type: application/json

{ "planId": "rsplay_studio_pro" }
```

### 3.2 Comportamento do Servidor

| Primeira requisição | Requisição duplicada (mesma key) |
|---------------------|----------------------------------|
| Processa normalmente | Retorna resultado cacheado da primeira |
| Armazena resultado associado à key | Não reexecuta a operação |
| Retorna 201/200 | Retorna 200 com mesmo resultado |

### 3.3 TTL da Chave

- Chaves de idempotência expiram após 24 horas
- Após expiração, nova requisição com mesma key é tratada como nova operação

### 3.4 Endpoints que Exigem Idempotência

| Endpoint | Método | Idempotência |
|----------|--------|--------------|
| /api/v1/billing/subscribe | POST | Obrigatória |
| /api/v1/shows | POST | Obrigatória |
| /api/v1/episodes | POST | Obrigatória |
| /api/v1/ai/* | POST | Obrigatória |
| /api/v1/billing/subscriptions/:id/renew-now | POST | Obrigatória |

### 3.5 Implementação

```typescript
// Middleware de idempotência
app.use('/api/v1/', idempotencyMiddleware);

function idempotencyMiddleware(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const key = req.headers['idempotency-key'];
    if (!key) {
      return res.status(400).json({ code: 'MISSING_IDEMPOTENCY_KEY' });
    }
    // Verificar se já processamos esta key
    const cached = idempotencyStore.get(key);
    if (cached) {
      return res.status(cached.status).json(cached.body);
    }
    // Interceptar resposta para cachear
    const originalSend = res.send;
    res.send = function(body) {
      idempotencyStore.set(key, { status: res.statusCode, body });
      return originalSend.call(this, body);
    };
  }
  next();
}
```

---

## 4. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Implementar middleware de idempotência (`Idempotency-Key`)
- [ ] Armazenar chaves em Redis com TTL de 24h
- [ ] Aplicar em endpoints de escrita críticos (billing, shows, episodes, AI)
- [ ] Retornar 400 quando `Idempotency-Key` ausente em endpoints que exigem
- [ ] Testar requisições duplicadas (mesma key → mesmo resultado)
- [ ] Testar expiração de chave (após 24h, nova operação)

---

## 5. REFERÊNCIA

- Stripe Idempotency: https://docs.stripe.com/docs/idempotent-requests
- HTTP Idempotency: https://datatracker.ietf.org/doc/html/rfc7231#section-4.2.2
