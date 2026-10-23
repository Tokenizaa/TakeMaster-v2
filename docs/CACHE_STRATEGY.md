# 🚀 Cache Strategy

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Backend Architect  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Reduzir carga no banco de dados Supabase e melhorar latência de leitura implementando cache em camadas para dados frequentemente acessados.

---

## 2. ARQUITETURA DE CACHE

### 2.1 Camadas

| Camada | Tecnologia | Escopo | TTL |
|--------|-----------|--------|-----|
| L1 - Memória (Node.js) | Node.js Map / node-cache | Dados de sessão, configuração | 5 min |
| L2 - Distribuído | Redis | Dados de programa, episódio, catálogo | 15 min |
| L3 - CDN | Cloudflare | Assets estáticos, imagens | 24h |

### 2.2 Dados para Cache

| Dado | Chave de Cache | TTL | Invalidação |
|------|---------------|-----|-------------|
| Programa por ID | `show:{id}` | 15 min | Atualização/exclusão |
| Episódio por ID | `episode:{id}` | 15 min | Atualização/exclusão |
| Lista de shows org | `org:{orgId}:shows` | 5 min | Nova show/exclusão |
| Catálogo público | `catalog:programs` | 30 min | Novo programa no catálogo |
| Sessão de usuário | `session:{token}` | 12h | Logout/expiração |
| Métricas de saúde | `health:db` | 30s | Cada health check |

### 2.3 Padrões de Cache

- **Cache-Aside:** Ler do cache, se miss ler do banco e popular cache
- **Write-Through:** Escrever no banco e no cache simultaneamente
- **Write-Back (para escrita assíncrona):** Escrever no cache, escrever no banco em background

### 2.4 Exemplo de Implementação

```typescript
// src/server/cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

export function getCached<T>(key: string): T | null {
  const val = cache.get(key);
  return val ? (val as T) : null;
}

export function setCached<T>(key: string, value: T, ttl?: number): void {
  cache.set(key, value, ttl);
}

export function invalidate(key: string): void {
  cache.del(key);
}
```

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Instalar `node-cache` para cache em memória (L1)
- [ ] Configurar Redis para cache distribuído (L2)
- [ ] Implementar cache para leituras frequentes (shows, episódios, catálogo)
- [ ] Implementar invalidação de cache em escritas (PUT/POST/DELETE)
- [ ] Adicionar headers `Cache-Control` nas respostas HTTP
- [ ] Configurar Cloudflare CDN para assets estáticos
- [ ] Monitorar hit rate do cache
- [ ] Definir alerta para hit rate < 80%

---

## 6. REFERÊNCIA

- node-cache: https://www.npmjs.com/package/node-cache
- Redis: https://redis.io/
- Cloudflare Cache: https://developers.cloudflare.com/cache/
