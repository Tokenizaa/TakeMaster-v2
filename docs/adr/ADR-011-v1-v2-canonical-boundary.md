# ADR-011 — Limite Canônico entre V1 e V2

- **Status:** Aceita
- **Data:** 2026-10-04
- **Escopo:** governança de arquitetura e recuperação contra regressão
- **Branch de referência:** `reconcile/canonical-main`

## Contexto

O TakeMaster V2 é uma reconstrução deliberada. O V1 pode fornecer comportamento comprovado, funcionalidades e referências de domínio, mas não é a implementação-base do V2.

Durante a execução recente houve risco de confusão entre as duas gerações do produto. Essa situação precisa ser explicitamente bloqueada para impedir que uma implementação legada seja tratada como arquitetura canônica do V2.

## Decisão

O V2 é a única fonte de verdade para sua arquitetura, contratos, vocabulário, organização do código e decisões de implementação.

O V1 pode ser consultado somente como **fonte de referência de comportamento/funcionalidade comprovada**, quando uma tarefa do V2 determinar explicitamente que essa funcionalidade deve ser recuperada.

Isso significa:

1. V2 não é um fork do V1.
2. Código do V1 não deve ser copiado para o V2 apenas porque já existia.
3. Código legado só pode entrar no V2 após validação de compatibilidade com os contratos e arquitetura canônicos do V2.
4. O vocabulário canônico do V2 prevalece sobre nomes legados.
5. Supabase/Postgres compartilhado e NVIDIA NIM permanecem decisões do V2 já registradas.
6. O novo deployment Cloudflare pertence ao V2 e não deve recuperar a infraestrutura de deployment do V1.
7. Uma tarefa que encontrar conflito V1 × V2 deve parar antes de implementar e registrar o conflito.
8. Nenhuma restauração deve ser feita por comparação visual ou por suposição de que “o V1 funcionava”; a origem, o contrato e o impacto precisam ser verificados.

## Fonte de verdade

Para trabalho no V2, a ordem de precedência é:

1. código e contratos canônicos da branch de trabalho do V2;
2. ADRs e documentação canônica do V2;
3. schema/estado real do Supabase validado para o V2;
4. histórico de commits e PRs do próprio V2;
5. V1 somente como referência de comportamento/funcionalidade explicitamente solicitada.

## Regra operacional para agentes

Antes de modificar código do TakeMaster V2, o agente deve identificar:

- qual fase do V2 está sendo executada;
- qual contrato/ADR fundamenta a alteração;
- se a referência usada pertence ao V2 ou ao V1.

Se a implementação proposta vier do V1 e não houver uma decisão explícita de portabilidade para o V2, **não implementar**.

## Relação com Cloudflare

A decisão de deployment do V2 permanece independente da infraestrutura do V1:

`React/Vite → Cloudflare → API/Worker → Supabase/NVIDIA`

A implementação concreta dessa arquitetura será tratada em etapa própria, depois do fechamento do diagnóstico e sem importar automaticamente o runtime do V1.

## Consequência

A prioridade imediata é preservar o estado canônico atual do V2 e evitar novas regressões. Qualquer restauração de funcionalidade deverá ocorrer em tarefa específica, documentada e validada contra esta ADR.
