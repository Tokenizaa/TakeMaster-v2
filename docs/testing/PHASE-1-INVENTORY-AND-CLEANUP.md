# Fase 1 — Inventário e limpeza da suíte de testes

**Status:** limpeza dos testes legados concluída; reconstrução funcional ainda não iniciada.  
**Branch:** `main`  
**Commit-base do inventário:** `653917be520cb653db53050ebe16c760c8fb2c21`

## Escopo inventariado

A busca recursiva do repositório identificou dois arquivos de testes executáveis em `tests/`:

| Arquivo removido | Escopo anterior |
|---|---|
| `tests/v2.unit.test.ts` | Quatro casos sobre validação de payload e failover de credenciais NVIDIA |
| `tests/v2.integration.test.ts` | Quatro casos sobre conexão Supabase, isolamento organizacional e ciclo de vida programa/temporada/episódio |

A configuração `playwright.config.ts` apontava para `tests/e2e-visual.test.ts`, mas esse arquivo não existia no `main` inventariado. Os scripts E2E, portanto, apontavam para um arquivo ausente. Não foram encontrados outros arquivos com extensões `.test.*` ou `.spec.*` no inventário da árvore.

## Ações concluídas

- Removidos os dois arquivos de testes legados.
- Removidos os scripts de teste antigos do `package.json`, evitando comandos que apontem para arquivos eliminados.
- Mantidos Playwright e sua configuração como infraestrutura para a nova suíte E2E.
- Removida temporariamente a etapa de execução de testes do workflow de CI. Ela deverá ser reativada quando a nova suíte for implementada na Fase 2; a CI não deve anunciar cobertura de testes que não existe.
- Nenhum arquivo da aplicação foi removido.
- Nenhuma cobrança real ou escrita em banco de dados foi executada durante esta limpeza.

## Riscos e pendências identificados

1. O workflow de CI falhou anteriormente durante `bun install --frozen-lockfile` porque o lockfile divergia das dependências declaradas. Essa falha permanece fora do escopo de limpeza e deverá ser resolvida antes da certificação.
2. Os testes de integração antigos permitiam escritas em Supabase remoto mediante variáveis de ambiente. Não foram executados; a nova estratégia deverá exigir isolamento explícito dos dados.
3. O mapa canônico anterior descrevia testes e cobertura que não correspondem à árvore executável atual. Deve ser tratado como documentação histórica até ser substituído pelo contrato de cobertura da nova suíte.
4. Os testes de cadastro, autenticação, onboarding, administrador geral, rotinas funcionais e VenoPag ainda precisam ser especificados e implementados nas fases seguintes.

## Critério de saída da Fase 1

- [x] Inventário recursivo dos arquivos de teste.
- [x] Remoção dos testes legados encontrados.
- [x] Remoção de comandos que apontavam para os testes eliminados.
- [x] CI ajustada para não tentar executar a suíte removida.
- [ ] Validação local de build/TypeScript e do lockfile — não executada nesta etapa; requer ambiente de execução local.
- [ ] Nova suíte implementada — pertence às fases seguintes.

A Fase 1 conclui a limpeza e registra seus limites. Ela não certifica o build, o TypeScript, a integração Supabase ou a aplicação em produção.
