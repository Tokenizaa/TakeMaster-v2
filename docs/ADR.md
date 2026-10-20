# TakeMaster V2 — Decisões Arquiteturais

## ADR-001 — V2 é uma reconstrução intencional
**Status:** Aceita.

A V2 preserva aprendizados comprovados da V1, mas não replica sua dívida arquitetural. O código atual e os contratos canônicos são a referência.

## ADR-002 — Supabase é a fonte única de persistência
**Status:** Aceita.

O TakeMaster V2 usa o projeto Supabase canônico como fonte de verdade operacional. SQLite, `db.json` e adapters paralelos não fazem parte do runtime.

## ADR-003 — Produção/Temporada permanece no domínio
**Status:** Aceita.

A hierarquia Programa → Produção/Temporada → Episódio é necessária para gestão de ciclos de produção e não será removida para simplificar artificialmente o modelo.

## ADR-004 — Compatibilidade legada somente na borda
**Status:** Aceita.

Show/Program, Production/Season e Guest/Participant podem ter mapeamentos de compatibilidade. Não criar entidades duplicadas para esses aliases.

## ADR-005 — IA é assistiva, validada e server-side
**Status:** Aceita.

NVIDIA NIM é o provider. Toda saída estruturada passa por validação runtime. A aplicação decide o que pode ser persistido.

## ADR-006 — Editorial é orientado por conhecimento verificável
**Status:** Aceita.

Identidade e pautas devem ser derivadas do conhecimento disponível e do contexto operacional. Informação ausente não deve ser inventada.

## ADR-007 — Não duplicar arquitetura sem necessidade
**Status:** Aceita.

Não criar novo banco, RAG, editor, contexto, RBAC, CMS ou módulo apenas para resolver um problema que a estrutura existente já resolve.

## ADR-008 — Falhas não devem virar dados falsos
**Status:** Aceita.

Falha de persistência, autenticação ou IA deve ser explícita. O sistema não deve retornar fixtures, seeds ou conteúdo inventado para mascarar erro.

## ADR-009 — Segurança é requisito de cada operação
**Status:** Aceita.

Toda leitura/escrita deve considerar organização, programa e usuário autenticado. RLS e autorização server-side fazem parte do contrato operacional.

## ADR-010 — Identidade única e acesso autorizado a múltiplos programas
**Status:** Aceita como contrato de produto; implementação pendente de mapeamento e validação.

RS Play TV é a organização comum da plataforma. Cada programa tem contratação, diretor executivo responsável, equipe e permissões próprios. Uma pessoa mantém uma identidade e uma sessão únicas e pode trabalhar em vários programas quando cada responsável autorizar explicitamente seu vínculo.

A troca de programa é uma mudança de contexto de trabalho, não uma concessão de acesso. Toda operação protegida deve verificar no backend o vínculo e as permissões do usuário para o programa-alvo. A revogação em um programa não remove os vínculos válidos em outros.

Não criar contas duplicadas para profissionais compartilhados nem exigir uma organização por programa. Antes de qualquer alteração no banco, mapear os vínculos existentes e preservar IDs/dados; não excluir automaticamente organizações extras. A especificação funcional está em [docs/MODELO_ACESSO_MULTIPROGRAMA.md](MODELO_ACESSO_MULTIPROGRAMA.md).

Esta decisão é documental nesta etapa: não implica implementação, migração de dados nem execução de testes.

## ADR-011 — VenoPag como gateway planejado para contratação de programas
**Status:** Implementação em revisão na PR #11; operação real e migração ainda não verificadas.

O gateway escolhido para planejar a contratação de programas é o VenoPag, usando como referência técnica o SDK em https://github.com/Tokenizaa/venopag. A primeira fase de integração limita-se a criar cobrança PIX (Cash In), apresentar os dados de pagamento e confirmar o estado por webhook autenticado e/ou consulta da transação, com idempotência e reconciliação.

A cobrança deve pertencer à contratação do programa e ao diretor executivo responsável, não ao vínculo pessoal de cada profissional da equipe. O acesso só pode ser liberado depois de confirmação confiável do pagamento, conforme as regras comerciais aprovadas. Criar cobrança ou retornar ao navegador não equivale a pagamento confirmado.

Segredos permanecem no backend. Saques, transferências e outras operações financeiras ficam fora do escopo inicial. A documentação do SDK não comprova credenciais, sandbox, disponibilidade comercial, recorrência ou configuração operacional; esses pontos devem ser confirmados antes de implementar.

A especificação está em [docs/PLANEJAMENTO_INTEGRACAO_VENOPAG.md](PLANEJAMENTO_INTEGRACAO_VENOPAG.md). Esta decisão não autoriza alterações no código de produto, banco, credenciais ou produção e não declara testes executados.
