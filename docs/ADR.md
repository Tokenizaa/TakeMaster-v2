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
