# ADR-011 — Identidade Canônica entre V1 e V2

- **Status:** Aceita
- **Data:** 2026-10-04
- **Escopo:** governança de versão, arquitetura e prevenção de regressão
- **Branch de referência:** `reconcile/canonical-main`

## Contexto

A investigação do histórico do repositório corrigiu uma inversão de nomenclatura presente na documentação anterior.

O **TakeMaster V2 é o produto/frontend original**, cuja linhagem está documentada no commit `68b8ca2659772d38e2b62146da7f87bddb4e7207` (`feat: initialize TakeMaster-v2 project scaffolding`). Essa base contém a superfície original do produto: Dashboard, Episodes, Shows, Guests, Studio, editor de episódio e os fluxos editoriais/assistidos por IA.

A linhagem posterior de reconstrução arquitetural, persistência e autorização foi anteriormente descrita como “V2”. Essa identificação estava invertida. Essa linhagem deve ser tratada como **V1** para fins de versionamento histórico e não pode substituir ou redefinir a identidade do produto V2.

## Decisão

A partir desta ADR:

1. **V2 = produto original TakeMaster V2**, incluindo sua UI, fluxos e comportamento de produto comprovados pelo histórico.
2. **V1 = reconstrução arquitetural posterior que foi anteriormente rotulada como V2**.
3. A UI e o comportamento do V2 são a referência canônica para a superfície do produto.
4. A arquitetura, persistência, autorização, contratos e demais melhorias válidas desenvolvidas na linhagem V1 podem ser reutilizadas no V2 quando forem compatíveis, mas não podem redefinir, remover ou simplificar a superfície do V2.
5. Componentes do V2 não devem ser removidos ou classificados como “legados” apenas por terem origem no commit `68b8ca2`.
6. Conflitos entre o produto V2 e a reconstrução V1 devem ser resolvidos preservando o comportamento e a superfície do V2, enquanto a infraestrutura tecnicamente válida da V1 pode ser adaptada para sustentá-los.
7. O deployment de produção é do **TakeMaster V2**. A infraestrutura de deployment da linhagem V1 não deve ser importada cegamente.
8. Nenhuma alteração de versão, UI ou arquitetura deve ser feita com base na nomenclatura anterior sem verificar esta ADR.

## Evidência histórica

A identidade foi confirmada pela sequência histórica:

- `68b8ca2` — inicialização do projeto TakeMaster-v2 com a superfície completa do produto.
- `5845d91` — início da documentação que passou a chamar a reconstrução arquitetural de V2.
- `0fc4b68`, `7af1f46` e `22a9b5f` — evolução da linhagem arquitetural posteriormente rotulada como V2.
- A busca pelo histórico não encontrou uma linhagem de commits denominada “V1” correspondente ao produto original; a inversão ocorreu na documentação/organização posterior.

## Fonte de verdade

Para o produto V2, a precedência é:

1. superfície e comportamento do produto V2;
2. contratos e decisões arquiteturais compatíveis com essa superfície;
3. ADRs e documentação corrigidas;
4. schema/estado real do Supabase validado;
5. histórico de commits e PRs;
6. V1 somente como fonte de infraestrutura, arquitetura ou comportamento que seja explicitamente compatível e portável para o V2.

## Regra operacional para agentes

Antes de modificar o TakeMaster V2, o agente deve:

- identificar que está trabalhando no **produto V2**;
- preservar a superfície existente do V2;
- identificar se a referência encontrada pertence à linhagem V1 ou V2;
- reutilizar infraestrutura V1 somente quando ela servir ao produto V2 sem substituir seus fluxos;
- parar e registrar qualquer conflito que exija remover ou redesenhar comportamento do V2.

É proibido interpretar “V2” como “reconstrução posterior” ou usar essa interpretação para substituir a UI original.

## Relação com Cloudflare

A produção alvo é do TakeMaster V2. A arquitetura Cloudflare deve ser implementada para servir o produto V2 e seus contratos, sem importar automaticamente o runtime da reconstrução V1.

## Consequência

A prioridade imediata é preservar a superfície original do V2 e corrigir toda documentação que ainda apresente a reconstrução posterior como V2. Depois da correção documental, as etapas de implementação podem ser retomadas sobre essa identidade única e sem novas regressões de versão.
