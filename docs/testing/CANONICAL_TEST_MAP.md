# Contrato canônico da suíte E2E — TakeMaster V2

**Estado:** Fase 1 (remoção dos E2E legados) concluída; Fase 2 (reconstrução da suíte) implementada em `main`; execução integral pendente da Fase 3.

## Regras obrigatórias

1. Todo teste tem identificador estável por domínio e cenário.
2. Testes precisam refletir rotas e comportamentos confirmados no código; não inventar endpoint de integração inexistente.
3. Cobertura autenticada exige identidade e organização de teste dedicadas, configuradas por ambiente.
4. Cenários com escrita exigem simultaneamente `E2E_TARGET_KIND=test|staging` e `E2E_ALLOW_PERSISTENT_WRITES=true`; devem limpar apenas recursos criados pelo próprio teste.
5. A URL alvo é `E2E_BASE_URL` explícita. Não usar localhost, fallback ou inicialização automática de servidor.
6. A bateria completa é executada após terminar a autoria dos testes, não durante sua construção.
7. Não realizar cobrança real, PIX, reset de seed ou chamadas pagas de IA como parte da bateria automatizada.
8. Falha de teste de comportamento esperado deve ser investigada como possível defeito do produto; não enfraquecer a asserção apenas para obter verde.
9. Evidências devem incluir resultado por identificador, motivo da falha, screenshots/traces quando aplicáveis e correção/reexecução.
10. Testes pulados por ausência de credenciais/configuração devem aparecer como bloqueados/skipped, nunca como aprovados.

## Mapa atual da suíte

| Família | IDs / cobertura |
|---|---|
| Plataforma | `PLATFORM-001..004`: health e shell web |
| Autenticação | `AUTH-001..006`: fronteiras anônimas e token inválido; `AUTH-010..014`: login/sessão, troca de organização, logout e recuperação |
| Autorização | `AUTHZ-*`: leitura e mutação anônimas em rotas protegidas |
| Catálogo | `CATALOG-001..002`: CRUD de programa e validação |
| Produção | `PRODUCTION-001`: ciclo de temporada |
| Episódios | `EPISODE-001`: ciclo CRUD |
| Participantes | `GUEST-001`: ciclo CRUD |
| Agenda | `SCHEDULE-001`: ciclo CRUD |
| Biblioteca | `LIBRARY-001`: ciclo CRUD |
| Workspace/UI | `WORKSPACE-001`, `UI-001..010`: estado agregado e navegação |
| Conhecimento | `KNOWLEDGE-001` e limite de acesso à identidade de programa |
| IA | `AI-*`: bloqueios anônimos para rotas de geração |
| Billing/admin | `BILLING-001`, `ADMIN-*`, `VENOPAG-*`: overview e limites de autorização sem iniciar cobranças |

## Limites conhecidos no produto atual

A inspeção do servidor não encontrou endpoints de logout, recuperação de senha nem webhook de gateway. Os testes de aceite de logout/recuperação são intencionalmente explícitos e não devem ser convertidos em aprovação enquanto esses fluxos estiverem ausentes. A integração de webhook/idempotência precisa de contrato real antes de se escrever um teste de sucesso; a suíte não deve inventar uma rota fictícia. Chamadas autenticadas de geração de IA ficam fora da execução contra provedores reais para evitar custos e efeitos externos.

## Configuração e evidência

- `E2E_BASE_URL`: URL remota aprovada.
- `E2E_LOGIN_EMAIL`, `E2E_LOGIN_CODE`, `E2E_ORGANIZATION_ID`: identidade de teste.
- `E2E_TARGET_KIND=test|staging` + `E2E_ALLOW_PERSISTENT_WRITES=true`: habilita CRUD com limpeza.
- `playwright.config.ts` exige URL HTTP(S), recusa localhost e produz relatório HTML/JSON, traces, screenshots e vídeos em falhas.
- O primeiro disparo integral é da Fase 3; nenhum teste foi executado durante a Fase 2.
