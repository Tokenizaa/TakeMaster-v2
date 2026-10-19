# TakeMaster V2 — Planejamento da integração de pagamentos VenoPag

**Status:** decisão de planejamento documentada; integração não implementada nem validada.  
**Repositório do gateway:** https://github.com/Tokenizaa/venopag  
**Documentação consultada:** README.md, src/client.ts, src/interfaces.ts, src/webhook.ts, src/crypto-utils.ts e package.json, branch master.  
**Escopo desta decisão:** planejamento somente. Não altera código de produto, banco de dados, credenciais, contratos comerciais ou produção. Nenhum teste de pagamento foi executado.

## 1. Decisão

O gateway de pagamento escolhido para o TakeMaster V2 é o **VenoPag**, usando o SDK mantido em `Tokenizaa/venopag` como referência de integração.

A integração deve fazer parte do fluxo comercial de contratação e setup inicial de cada programa. O diretor executivo contrata o programa sob sua responsabilidade; o pagamento e a assinatura devem ser associados à contratação daquele programa, não à conta individual de cada profissional que compõe a equipe.

**Princípio:** a contratação comercial pertence ao programa e ao seu responsável executivo; a identidade do usuário continua única e pode ter vínculos autorizados com vários programas.

A escolha do gateway não significa que a integração esteja pronta, que as credenciais estejam configuradas ou que pagamentos reais tenham sido confirmados.

## 2. Referência técnica consultada

Repositório: https://github.com/Tokenizaa/venopag

Arquivos consultados:
- [README.md](https://github.com/Tokenizaa/venopag/blob/master/README.md)
- [src/client.ts](https://github.com/Tokenizaa/venopag/blob/master/src/client.ts)
- [src/interfaces.ts](https://github.com/Tokenizaa/venopag/blob/master/src/interfaces.ts)
- [src/webhook.ts](https://github.com/Tokenizaa/venopag/blob/master/src/webhook.ts)
- [src/crypto-utils.ts](https://github.com/Tokenizaa/venopag/blob/master/src/crypto-utils.ts)
- [package.json](https://github.com/Tokenizaa/venopag/blob/master/package.json)

O README apresenta o pacote npm `venopag` e a classe `VenoPagClient`. A implementação declara:
- criação de cobrança PIX com `criarCashin`;
- consulta de transação com `consultarStatus`;
- consulta de saldo com `consultarSaldo`;
- saque PIX com `criarCashout`;
- transferência entre contas com `transferir`;
- verificação de assinatura de webhook HMAC-SHA256.

O cliente usa `clientId` e `clientSecret`, aceita opcionalmente `webhookSecret` e permite configurar `baseURL`; o valor padrão no código é `https://venopagments.com`. Esse host, o contrato da API, a disponibilidade do serviço e a compatibilidade operacional devem ser confirmados com o responsável pelo gateway antes de qualquer ativação.

## 3. Escopo da primeira integração

A primeira entrega deve limitar-se ao ciclo de contratação de um programa:

1. O diretor executivo seleciona o programa e o plano comercial.
2. O backend cria ou recupera uma intenção de contratação interna, com identificador único e vínculo explícito ao programa e ao responsável.
3. O backend solicita uma cobrança PIX ao VenoPag.
4. O TakeMaster apresenta ao contratante os dados de pagamento retornados pelo gateway, como QR Code e código PIX copia e cola, se disponíveis e válidos.
5. A contratação permanece pendente enquanto não houver confirmação confiável.
6. O backend recebe a notificação de pagamento ou consulta o estado da transação no gateway.
7. O TakeMaster valida a notificação e reconcilia a transação com a intenção de contratação original.
8. Somente após confirmação válida e consistente o sistema marca a contratação como paga/confirmada e libera as etapas de setup que dependem do pagamento.
9. O sistema registra o resultado e mantém referência aos identificadores do gateway para conciliação e suporte.

A UI não pode marcar um pagamento como concluído com base em redirecionamento do navegador, parâmetro enviado pelo cliente, retorno visual do checkout ou criação bem-sucedida da cobrança. Criar uma cobrança não significa que ela foi paga.

## 4. Estados e reconciliação

Antes da implementação, mapear os estados já existentes no TakeMaster e criar uma correspondência explícita com os estados reais do VenoPag. A biblioteca declara estados de Cash In como `pending`, `confirmed`, `expired`, `canceled`, `contested`, `chargedback` e `refunded`; os valores efetivamente enviados pela API devem ser confirmados na documentação operacional do gateway.

O fluxo interno precisa distinguir, pelo menos:
- cobrança criada;
- pagamento pendente;
- pagamento confirmado;
- cobrança expirada ou cancelada;
- pagamento contestado ou estornado, quando aplicável;
- erro técnico ou necessidade de reconciliação manual.

As transições devem ser idempotentes. Receber duas vezes o mesmo webhook ou consultar repetidamente uma transação não pode criar cobranças duplicadas, ativar duas vezes a assinatura ou duplicar concessões de acesso.

O sistema deve manter uma referência interna única para a contratação e armazenar os identificadores externos retornados pelo gateway, incluindo `request_number` e/ou `transaction_id` quando presentes. A correspondência não pode depender apenas de valor, nome ou horário.

## 5. Webhooks e segurança

A documentação do SDK descreve uma assinatura HMAC-SHA256 e um formato de assinatura com timestamp e digest. A implementação deve:
- confirmar o formato real do header e o algoritmo com o gateway;
- verificar a assinatura usando o corpo bruto exato recebido, antes de transformações que alterem os bytes;
- validar o timestamp e aplicar uma janela contra repetição, conforme o contrato do provedor;
- usar comparação resistente a timing attacks para o digest;
- rejeitar assinaturas ausentes ou inválidas;
- não confiar em payloads sem verificação;
- processar notificações de forma idempotente;
- registrar eventos para auditoria sem guardar segredos nem dados pessoais desnecessários;
- oferecer reconciliação via consulta de transação para tratar notificações ausentes ou atrasadas.

**Ponto de revisão do SDK:** as implementações de verificação consultadas comparam o HMAC usando igualdade de strings e não evidenciam, por si só, uma validação completa da idade do timestamp. Isso precisa ser corrigido ou encapsulado com segurança na integração do TakeMaster; não presumir que a função fornecida resolve todas as exigências de segurança.

## 6. Credenciais e limites de confiança

- `clientSecret` e `webhookSecret` devem existir somente no backend ou em serviço confiável.
- Nunca incluir segredos em código frontend, repositório, logs, URLs ou respostas da API ao navegador.
- Configurar credenciais por ambiente usando o mecanismo de secrets da infraestrutura escolhida.
- Separar ambiente de desenvolvimento/homologação e produção, caso o gateway disponibilize ambientes distintos.
- O cliente do gateway deve ser chamado no servidor; o navegador só recebe os dados de pagamento necessários para pagar.
- Restringir e auditar operações financeiras administrativas, especialmente saques e transferências.

A primeira entrega não deve implementar saque, transferência entre contas nem painel financeiro geral. São operações separadas, de maior risco, e não são necessárias para receber a contratação inicial.

## 7. Relação com programa, responsável e assinatura

Cada cobrança deve estar vinculada de forma inequívoca a:
- programa contratado;
- diretor executivo responsável pela contratação;
- plano/condições comerciais vigentes no momento da contratação;
- intenção interna de contratação;
- referência da transação no VenoPag;
- estado interno e datas relevantes.

A equipe compartilhada entre programas não deve ser obrigada a contratar novamente para ter acesso a outro programa. O pagamento de um programa não concede automaticamente acesso a outro e não altera os vínculos autorizados dos profissionais.

A política comercial sobre renovação, recorrência, inadimplência, cancelamento, reembolso e prazo de acesso ainda deve ser confirmada. Não inferir suporte a cobrança recorrente a partir dos métodos do SDK consultados: o README analisado documenta criação de cobrança PIX, mas não estabelece um fluxo completo de assinatura recorrente.

## 8. Pontos a confirmar antes da implementação

1. Credenciais comerciais válidas e responsável pela conta VenoPag.
2. URL oficial e versão/contrato atual da API.
3. Existência de sandbox ou ambiente de homologação e como obter credenciais de teste.
4. Formato e semântica oficiais de todos os estados de transação.
5. Contrato exato do webhook: header, corpo, retries, timeout, eventos e política de repetição.
6. Validade e expiração de QR Code/código PIX.
7. Regras de taxas, limites, estornos, chargebacks e conciliação.
8. Se o modelo comercial do TakeMaster exige pagamentos únicos ou recorrência; não implementar recorrência sem suporte confirmado.
9. Compatibilidade do SDK com o runtime de backend e processo de deploy do TakeMaster.
10. Mapeamento das tabelas e APIs existentes de programa, assinatura, cobrança e responsáveis para evitar criar registros comerciais duplicados.

O repositório consultado é uma referência técnica útil, mas não substitui a confirmação do contrato comercial e operacional do provedor.

## 9. Sequência planejada

1. **Mapear o estado atual do TakeMaster:** cadastro, onboarding, programas, responsáveis executivos, assinatura, cobrança e acesso condicionado a pagamento.
2. **Definir o contrato de pagamento:** modelo de intenção, estados, idempotência, webhook e reconciliação, aproveitando estruturas existentes quando apropriado.
3. **Preparar configuração segura:** secrets por ambiente, URL confirmada e ambiente de homologação, se disponível.
4. **Implementar Cash In:** criar cobrança e apresentar QR Code/copia e cola sem expor credenciais.
5. **Implementar confirmação segura:** webhook assinado, consulta de transação, idempotência e reconciliação.
6. **Vincular pagamento ao programa:** liberar a contratação e o setup conforme as regras comerciais confirmadas.
7. **Validar mediante autorização posterior:** cenários de pagamento confirmado, pendente, expirado, notificação repetida, assinatura inválida, falha de rede e divergência de valor/identificador.

Conforme a instrução atual, esta etapa é de planejamento e documentação. Não foram executados testes nem chamadas de pagamento; não foram alterados dados, credenciais ou sistemas de produção.

## 10. Critérios de aceite futuros

A integração só poderá ser considerada concluída quando:
- uma cobrança estiver vinculada à contratação e ao programa corretos;
- credenciais permanecerem exclusivamente no backend;
- o sistema não liberar o setup com base apenas na criação da cobrança ou no retorno do navegador;
- notificações forem autenticadas e processadas de forma idempotente;
- pagamentos pendentes, expirados, cancelados e confirmados tiverem tratamento explícito;
- consulta e webhook puderem reconciliar estados sem duplicar assinatura ou acesso;
- a troca de programa e os acessos multiprograma continuarem independentes da contratação comercial de outro programa;
- os cenários autorizados forem validados em ambiente apropriado antes da ativação real.

**Governança:** este documento complementa `docs/MODELO_ACESSO_MULTIPROGRAMA.md` e as decisões arquiteturais do TakeMaster V2. Se o comportamento atual divergir, registrar a diferença e planejar a alteração; não declarar a integração como existente antes da verificação.
