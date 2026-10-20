# Fase 2 — Reconstrução da suíte E2E

**Status da fase:** implementação da suíte concluída; execução integral reservada à Fase 3, conforme o plano de trabalho.  
**Branch:** `main`  
**Regra de destino:** `E2E_BASE_URL` explícita; sem fallback ou servidor local automático.

## Implementação registrada

- `tests/e2e-visual.test.ts`: smoke da interface, saúde, autenticação negativa, autorização anônima, barreiras administrativas, IA e billing.
- `tests/e2e-functional.test.ts`: login autenticado, sessão, estado do workspace, navegação autenticada, catálogo de conhecimento, isolamento entre organizações, rotinas CRUD de programa/temporada/episódio/participante/agenda/biblioteca, billing sem cobrança e visão administrativa.
- `playwright.config.ts`: carrega `.env`, exige URL absoluta HTTP(S), recusa localhost, não inicializa servidor local e coleta relatório HTML/JSON, screenshot, trace e vídeo em falhas.
- `package.json`: comandos `test:e2e`, `test:e2e:report`, `test:e2e:install` e `test:e2e:debug` disponíveis.
- Identificadores estáveis por domínio/cenário para permitir localizar e corrigir um caso sem alterar os demais.

## Condições de execução

Variáveis lidas pelo harness:

- `E2E_BASE_URL`: URL remota explicitamente aprovada.
- `E2E_LOGIN_EMAIL`, `E2E_LOGIN_CODE`, `E2E_ORGANIZATION_ID`: identidade e organização de teste.
- `E2E_TARGET_KIND=test` ou `staging` e `E2E_ALLOW_PERSISTENT_WRITES=true`: habilitam apenas cenários de escrita com limpeza por identificador criado pelo próprio cenário.

Sem credenciais, os casos autenticados ficam bloqueados/skipped explicitamente; não são reportados como aprovados. Sem a dupla proteção de ambiente de teste e permissão de escrita, os cenários CRUD não são executados. Nenhum teste inicia cobrança, altera assinatura, reseta seed ou realiza PIX real.

## Cobertura criada

| Domínio | Casos cobertos |
|---|---|
| Plataforma | Health operacional, estrutura do health, carregamento da aplicação e erros de página |
| Autenticação | Token ausente/adulterado, login inválido, sessão válida, troca de organização e tentativa de organização sem vínculo |
| Autorização | Leitura e mutação anônimas bloqueadas em workspace, métricas, catálogo, episódios, temporadas, convidados, agenda, biblioteca, administração, billing, IA e conhecimento por programa |
| Catálogo | Criar, ler, editar e excluir programa; payload inválido |
| Operação | CRUD de temporada, episódio, participante, agenda e asset, com limpeza do recurso criado |
| Workspace/UI | Estado agregado autenticado e navegação entre módulos operacionais |
| Administração | Visão administrativa e comportamento conforme papel |
| Billing | Leitura de planos/assinaturas/faturas/eventos sem iniciar cobrança; mutações anônimas bloqueadas |
| Conhecimento e IA | Catálogo público e barreiras de autenticação nas rotas de geração |
| Critérios de aceite | Casos explícitos para logout e recuperação de credenciais, que devem falhar enquanto a interface não oferecer esses fluxos |

## Lacunas de produto identificadas no código

- Não foi encontrada implementação de logout na interface.
- Não foi encontrada recuperação/redefinição de credenciais.
- O servidor atual não expõe rota de webhook de gateway nem contrato de idempotência de webhook. Não foi inventado um endpoint fictício para simular uma integração inexistente.
- As jornadas de geração de IA autenticada não são disparadas contra provedores reais nesta fase, para evitar chamadas externas/custos durante a construção.

Essas lacunas ficam registradas para tratamento na Fase 3/4 e não devem ser confundidas com testes aprovados. Um teste que identifique ausência de funcionalidade é uma falha de produto a corrigir, não motivo para enfraquecer a asserção.

## Execução e evidências

A bateria E2E **não foi executada durante a construção**. O primeiro disparo integral ocorre na Fase 3, depois que a suíte está escrita. A configuração gera evidências por teste em `test-results/e2e`, JSON em `test-results/playwright-results.json` e relatório HTML em `playwright-report`.

A Fase 2 encerra a autoria/configuração da suíte; não declara que o produto passou nos testes. Nenhum resultado de execução foi inventado.
