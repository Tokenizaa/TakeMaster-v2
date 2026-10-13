# Plano de prontidão para produção — TakeMaster V2

## Objetivo

Levar o TakeMaster V2 do estado atual de pré-homologação para uma release reproduzível, testada, observável e segura em produção, preservando o Supabase como fonte canônica e evitando novas arquiteturas paralelas.

## Critério de conclusão

O projeto só será considerado pronto quando todos os gates abaixo estiverem verdes:

- instalação limpa funciona em CI;
- migrations aplicadas em um ambiente vazio reproduzem o schema usado pelo backend;
- lint, testes unitários/integrados, build e E2E passam;
- autenticação, isolamento por organização/programa e permissões são validados;
- backup, rollback, observabilidade e operação estão documentados e testados;
- não existem alterações locais não revisadas no commit de release;
- aceite funcional do fluxo editorial principal foi registrado.

## Fases e entregáveis

### Fase 0 — Congelamento e inventário

**Objetivo:** estabelecer uma baseline confiável sem apagar trabalho existente.

Entregáveis:

- separar alterações relacionadas ao plano das demais alterações locais;
- registrar o commit-base e o estado do banco de produção/homologação;
- confirmar o ambiente-alvo, domínio, método de deploy e responsável pelo rollback;
- decidir oficialmente entre npm e Bun como gerenciador de instalação.

Gate: `git status` revisado, escopo de release definido e nenhum segredo no diff.

### Fase 1 — Reprodutibilidade de instalação e CI

**Objetivo:** qualquer checkout limpo deve instalar e validar o projeto.

Entregáveis:

- escolher e versionar o lockfile correspondente ao gerenciador oficial;
- corrigir o workflow para usar o lockfile escolhido;
- adicionar os scripts CI realmente existentes: lint, testes, build e governança;
- corrigir ou remover referências a `governance:check` inexistente;
- configurar variáveis de teste sem expor credenciais;
- habilitar verificações TypeScript apropriadas, preferencialmente `strict` por etapas.

Validação:

```bash
npm ci                         # ou instalação equivalente do gerenciador escolhido
npm run lint
npm test
npm run build
npm run governance:check
```

Gate: pipeline verde em checkout limpo, sem depender de `node_modules`, `.env` local ou arquivos gerados.

### Fase 2 — Schema e persistência canônicos

**Objetivo:** migrations, banco e backend falarem exatamente o mesmo modelo.

Entregáveis:

- comparar migrations versionadas com o schema efetivamente usado por `persistence.ts`;
- decidir, documentar e aplicar o modelo canônico (`programs/seasons/agenda_events` ou o modelo alternativo), sem duplicar entidades;
- criar/ajustar migrations incrementais para um banco vazio e para o banco existente;
- validar chaves, índices, constraints, RLS e funções `SECURITY DEFINER`;
- revisar IDs legados e garantir que a compatibilidade fique restrita à borda;
- executar testes CRUD com isolamento entre duas organizações.

Gate: banco novo e banco de homologação passam pelo mesmo conjunto de migrations e os testes de persistência passam sem intervenção manual.

### Fase 3 — Segurança e autorização

**Objetivo:** impedir acesso cruzado e reduzir riscos de operação.

Entregáveis:

- validar Bearer session, expiração, troca de organização e suspensão de usuário;
- testar cada rota de leitura e escrita como admin, editor, viewer e usuário sem vínculo;
- confirmar que IDs enviados pelo cliente nunca substituem o contexto autenticado;
- revisar políticas RLS redundantes e revogações de RPC;
- remover credenciais/defaults de demonstração da experiência de produção;
- adicionar rate limiting e proteção adequada para login, registro e endpoints de IA;
- garantir que service-role e chaves de IA nunca sejam expostos ao frontend.

Gate: suíte negativa cobrindo IDOR, organização incorreta, programa não autorizado, usuário suspenso e ausência de token.

### Fase 4 — Qualidade funcional e E2E

**Objetivo:** comprovar o caminho de negócio mais importante.

Fluxo mínimo:

```text
Login → Programa → Identidade → Pauta → Episódio → Salvar → Recarregar
```

Entregáveis:

- testes unitários para validações e contratos de IA;
- testes de integração para auth, CRUD, auditoria, billing e knowledge base;
- E2E para desktop e viewport principal do produto;
- teste de erro de rede, sessão expirada, resposta inválida da IA e reload;
- confirmação de que nenhum mock, `localStorage` ou seed é usado como fallback de produção;
- validação de acessibilidade básica e estados vazios/erro/carregamento.

Gate: fluxo editorial completo passa em ambiente de homologação com dados controlados e evidência anexada ao release.

### Fase 5 — Performance, observabilidade e operação

**Objetivo:** operar o serviço e diagnosticar falhas depois do deploy.

Entregáveis:

- concluir o build e investigar bundle ou transformação que exceda o limite operacional;
- definir health/readiness checks distintos, timeout e comportamento de indisponibilidade do Supabase/IA;
- centralizar logs estruturados sem dados sensíveis;
- definir métricas e alertas para erro 5xx, login, latência, falhas de IA e persistência;
- documentar backup, retenção, restore e migração reversa;
- definir runbook de incidente e procedimento de rollback.

Gate: restore de backup testado, alerta validado e rollback executado em homologação.

### Fase 6 — Homologação e release

**Objetivo:** liberar com risco controlado.

Checklist:

- congelar mudanças de feature;
- aplicar migrations em homologação;
- executar smoke test autenticado;
- confirmar variáveis e secrets de produção;
- revisar permissões, domínio, CORS e logs;
- obter aceite funcional;
- criar tag/versionamento de release;
- fazer deploy progressivo ou em janela controlada;
- executar smoke test pós-deploy;
- monitorar erros e latência durante a janela de observação.

Gate final: aceite do responsável pelo produto e plano de rollback disponível antes do deploy.

## Ordem recomendada

1. Fase 0 — baseline e decisão npm/Bun.
2. Fase 1 — CI, instalação limpa e build.
3. Fase 2 — alinhamento de schema e persistência.
4. Fase 3 — segurança e autorização.
5. Fase 4 — integração e E2E.
6. Fase 5 — operação, performance e rollback.
7. Fase 6 — homologação e produção.

Fases 1 e 2 são bloqueadoras: não iniciar homologação formal enquanto instalação e schema não forem reproduzíveis.

## Riscos atuais prioritários

| Prioridade | Risco | Tratamento |
|---|---|---|
| P0 | CI usa `npm ci` sem `package-lock.json` | decidir gerenciador e corrigir pipeline |
| P0 | migrations divergem das tabelas consultadas pelo backend | consolidar schema canônico |
| P0 | testes dependem de Supabase e ambiente local | criar configuração/mocks de teste reproduzível |
| P1 | build não conclui no tempo observado | diagnosticar transformação, dependências e bundle |
| P1 | permissões e defaults de demonstração | remover defaults e ampliar testes negativos |
| P1 | alterações locais não consolidadas | revisar e separar commits antes do release |

## Evidências exigidas no release

- link do pipeline verde;
- relatório dos testes e do E2E;
- hash/tag do release;
- lista de migrations aplicadas;
- resultado do smoke test;
- evidência de backup/restore;
- responsável e comando de rollback;
- aceite funcional registrado.

