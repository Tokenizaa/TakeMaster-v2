# Runbook de ativação do VenoPag — TakeMaster V2

**Estado atual:** código implementado na PR #11; este runbook ainda não foi executado. Não há confirmação de credenciais VenoPag, migration aplicada ou pagamento real.

## 1. Pré-requisitos obrigatórios

Antes de habilitar o checkout, obter e confirmar com a VenoPag:
- `clientId`, `clientSecret` e segredo de webhook corretos para o ambiente.
- Host/API oficial contratado e se existe sandbox utilizável. Não assumir que o host padrão do SDK é o endpoint contratado.
- Formato exato da assinatura do webhook, cabeçalhos, timestamp, política de repetição e estados finais de pagamento.
- Formato do QR Code e do código PIX, prazo de expiração, taxas, estorno e tratamento de contestação.
- URL HTTPS pública do webhook: `/api/webhooks/venopag`.

**Não habilitar cobrança real enquanto qualquer item acima estiver incerto.** A versão atual implementa PIX avulso; não oferece recorrência automática.

## 2. Configuração de segredos

Definir apenas no ambiente de servidor/Worker, nunca no frontend, no repositório ou em variáveis `VITE_*`.

Variáveis obrigatórias:
- `VENOPAG_CLIENT_ID`
- `VENOPAG_CLIENT_SECRET`
- `VENOPAG_WEBHOOK_SECRET`
- `VENOPAG_WEBHOOK_URL` — URL HTTPS pública completa para o webhook.

`VENOPAG_BASE_URL` só deve ser definido quando a VenoPag confirmar um host diferente do padrão implementado.

No Cloudflare, configurar os valores com o mecanismo de secrets/variables do ambiente correto. Não copiar valores secretos para comandos compartilhados, logs, issues ou comentários de PR. Validar presença/ausência das variáveis por meio de health/configuration checks sem imprimir seus valores.

## 3. Migration e preservação dos dados

Migration a revisar/aplicar: `supabase/migrations/20261019000002_venopag_pix_checkout.sql`.

1. Confirmar que o projeto Supabase e o ambiente alvo são os corretos.
2. Revisar o SQL integralmente e confirmar backup/restauração disponíveis.
3. Aplicar a migration primeiro em ambiente não produtivo e validar a estrutura, RLS e RPC.
4. Verificar os programas existentes sem `executive_user_id`; não inferir nem preencher responsáveis automaticamente.
5. Confirmar que nenhum acesso a programa é concedido apenas por pertencer à organização.
6. Só aplicar em produção após aprovação explícita do responsável pelo ambiente.

A migration é aditiva; não remover tabelas ou registros de pagamento como rollback automático. Se houver problema após aplicação, interromper novos checkouts, preservar a trilha de auditoria e corrigir com migration compensatória revisada.

## 4. Sequência de ativação

- [ ] PR #11 revisada e aprovada.
- [ ] CI verde para o commit exato que será promovido.
- [ ] Endpoint, estados e assinatura confirmados com a VenoPag.
- [ ] Segredos configurados no ambiente correto.
- [ ] Migration aplicada e validada no ambiente de homologação.
- [ ] Teste de webhook assinado com payload de teste, sem criar cobrança real.
- [ ] Fluxo completo testado em sandbox, se a VenoPag disponibilizar um.
- [ ] Migration aplicada em produção após autorização.
- [ ] Segredos de produção configurados e webhook registrado no provedor.
- [ ] Um pagamento real de baixo valor executado somente com autorização, com reconciliação confirmada e evidências registradas.
- [ ] Conferir que pagamento pendente não ativa o programa; pagamento confirmado ativa apenas o programa correto; repetição de webhook não duplica a assinatura.
- [ ] Conferir que revogar equipe no Programa A não altera acesso ao Programa B.

## 5. Critérios para interromper a ativação

Interromper imediatamente a liberação de cobranças se ocorrer qualquer um destes casos:
- assinatura inválida ou timestamp ausente/vencido;
- divergência entre valor, moeda, referência do programa ou identificador do pagamento;
- estado do gateway desconhecido ou ambíguo;
- falha de reconciliação do pagamento com a assinatura;
- acesso concedido a programa diferente daquele contratado;
- repetição de cobrança ou duplicação de assinatura.

Não marcar um pagamento como confirmado com base apenas no retorno do navegador, na criação da cobrança ou em um redirecionamento do provedor.

## 6. Rollback operacional

1. Desabilitar a criação de novas cobranças no ambiente afetado sem apagar intenções existentes.
2. Preservar os identificadores do gateway e o histórico para conciliação.
3. Não revogar automaticamente assinaturas pagas nem apagar registros financeiros.
4. Corrigir por nova versão/migration compensatória após identificar a causa.
5. Reabilitar somente após CI, revisão de segurança e reconciliação das intenções pendentes.

## Evidência atual

- PR: https://github.com/Tokenizaa/TakeMaster-v2/pull/11
- A validação de código reportada pela CI inclui governance check, TypeScript, testes unitários e build/dry-run do Worker.
- Não foram configurados segredos, aplicadas migrations em ambientes, nem disparadas transações reais nesta etapa.