# 📊 Testes de Desempenho, Acessibilidade e Regressão Visual

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** QA / Performance Engineer / Accessibility Auditor  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Garantir que a aplicação atenda a padrões de desempenho, acessibilidade (WCAG 2.1 AA) e não apresente regressões visuais antes do go-live.

---

## 2. TESTES DE DESEMPENHO

### 2.1 Métricas de Web Vitals

| Métrica | Meta (Verde) | Meta (Amarelo) | Meta (Vermelho) |
|---------|-------------|----------------|-----------------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| FID (First Input Delay) | ≤ 100ms | ≤ 300ms | > 300ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| TTFB (Time to First Byte) | ≤ 200ms | ≤ 500ms | > 500ms |

### 2.2 Testes de Carga (k6 / Artillery)

- 100 usuários simultâneos
- Ramp-up de 5 minutos
- Manter carga por 10 minutos
- Metas: erro < 1%, p95 < 2s

### 2.3 Implementação

```typescript
// Exemplo de teste de carga com k6
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '10m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.staging.rsplaytv.com.br/api/v1/shows');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

---

## 3. ACESSIBILIDADE (WCAG 2.1 AA)

### 3.1 Critérios a Validar

| Critério | Técnica | Ferramenta |
|----------|---------|------------|
| Contraste de cores | ≥ 4.5:1 texto normal, ≥ 3:1 texto grande | axe-core, WAVE |
| Navegação por teclado | Todos os elementos focáveis | Teclado manual |
| Texto alternativo | Imagens têm `alt` apropriado | axe-core |
| Labels de formulário | Todos inputs têm label associado | axe-core |
| Foco visível | Indicador de foco visível | Teste manual |
| Landmarks ARIA | header, main, nav, footer | axe-core |
| Idioma da página | `lang` attribute no `<html>` | Teste manual |

### 3.2 Implementação

```bash
# Acessibilidade com axe-core + Playwright
npx axe-core --include '#app' --tags wcag2a,wcag2aa
```

---

## 4. REGRESSÃO VISUAL

### 4.1 Abordagem

Comparar screenshots de páginas principais contra baseline aprovado:

- Página inicial
- Login
- Dashboard do programa
- Editor de episódio
- Painel admin

### 4.2 Ferramentas

- Playwright Visual Testing (já configurado em `tests/e2e-visual.test.ts`)
- Percy / Chromatic (opcional)

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Configurar k6 ou Artillery para testes de carga
- [ ] Definir metas de Web Vitals e monitorar em produção
- [ ] Executar auditoria de acessibilidade (axe-core) em todas as páginas
- [ ] Validar navegação por teclado em fluxos críticos
- [ ] Configurar regressão visual com Playwright
- [ ] Adicionar testes de desempenho ao CI (thresholds de falha)
- [ ] Documentar resultados de testes antes do go-live

---

## 6. REFERÊNCIA

- Web Vitals: https://web.dev/vitals/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- axe-core: https://www.deque.com/axe/
- Playwright Visual: https://playwright.dev/docs/test-snapshots
