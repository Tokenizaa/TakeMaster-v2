# TakeMaster V2 — Modelo de contratação de programas e acesso multiprograma

**Status:** decisão de produto e arquitetura documentada; implementação ainda não validada.  
**Escopo:** documentação somente. Não altera código, banco, dados, autenticação, cobrança ou permissões em produção.

## 1. Decisão canônica

A RS Play TV é a organização única da plataforma. Dentro dela, cada programa é contratado e administrado por seu próprio diretor executivo. Profissionais podem trabalhar em vários programas usando uma única identidade e uma única sessão, desde que cada diretor executivo responsável autorize o acesso ao seu programa.

**Princípio central: identidade compartilhada; contratação, responsabilidade e autorização isoladas por programa.**

A organização representa o contexto administrativo comum. O programa é o contexto principal de trabalho e a fronteira de autorização operacional.

## 2. Cenário que o sistema deve suportar

1. O diretor executivo A cria sua conta, contrata o Programa A, realiza o pagamento e conclui o setup inicial.
2. O diretor executivo B realiza o mesmo processo de forma independente para o Programa B.
3. Ambos os programas utilizam alguns dos mesmos profissionais, por exemplo, um diretor de edição e uma equipe de produção.
4. Se o profissional já possui uma conta, o diretor executivo B pode autorizar seu acesso ao Programa B sem exigir um segundo cadastro ou uma segunda conta.
5. O profissional entra uma única vez e alterna entre os programas para os quais tem autorização.
6. A autorização dada por A vale somente para o Programa A; B controla separadamente o acesso ao Programa B.

A contratação de um programa não deve depender de que todos os profissionais da equipe sejam exclusivos daquele programa.

## 3. Conceitos e responsabilidades

### Organização

- A organização operacional canônica é RS Play TV.
- Agrupa o ambiente comum da plataforma.
- Não substitui a responsabilidade individual de cada diretor executivo sobre seu programa.
- Não deve ser usada como motivo para duplicar usuários ou obrigar a equipe a fazer logins separados.

### Programa

- É a unidade de trabalho, configuração e autorização.
- Possui um diretor executivo responsável.
- Tem equipe, funções e permissões próprias.
- Tem sua contratação, assinatura e estado comercial próprios, conforme o produto comercial definido.
- Mantém seus dados operacionais isolados dos demais programas.

### Usuário

- Representa uma identidade única da pessoa na plataforma.
- Pode ter acesso a nenhum, um ou vários programas.
- Mantém uma sessão autenticada única enquanto alterna entre programas.
- Não ganha acesso a um programa apenas por pertencer à organização comum ou por acessar outro programa.

### Vínculo usuário–programa

É a relação que concede acesso explícito de um usuário a um programa. Deve permitir representar, no mínimo:

- usuário;
- programa;
- função no programa;
- estado do acesso, por exemplo, pendente, ativo ou revogado;
- quem autorizou o acesso;
- quando foi autorizado e, quando aplicável, revogado.

Os nomes e estados definitivos devem ser conciliados com o esquema existente antes de qualquer migração. Este documento define o contrato de produto, não uma tabela SQL obrigatória.

### Diretor executivo responsável

- Conclui a contratação e o setup inicial do seu programa.
- Administra a equipe e as permissões daquele programa.
- Autoriza ou revoga os acessos ao programa sob sua responsabilidade.
- Não administra automaticamente outros programas apenas porque compartilha profissionais com eles.
- Não pode conceder permissões que excedam sua autoridade naquele programa.

## 4. Fluxo de contratação e setup inicial

O onboarding do diretor executivo deve orientar a pessoa a:

1. criar ou acessar sua identidade;
2. localizar e selecionar o programa que deseja contratar;
3. concluir a contratação e o pagamento conforme o fluxo comercial real;
4. concluir o setup inicial desse programa;
5. entrar no ambiente de trabalho do programa;
6. convidar profissionais ou localizar usuários existentes e registrar as autorizações necessárias.

O onboarding não deve exigir que o contratante crie uma nova organização para cada programa. Cadastro de usuário, contratação, criação/configuração do programa e gestão de equipe são etapas conceitualmente distintas, mesmo que a interface as encadeie em um fluxo simples.

Não se deve afirmar que pagamento, assinatura ou convite foram concluídos sem confirmação do serviço responsável.

## 5. Autorização e compartilhamento de equipe

O fluxo esperado é:

1. O diretor executivo responsável abre a gestão de equipe do seu programa.
2. Localiza um usuário existente ou convida alguém que ainda não tenha conta.
3. Define a função e as permissões adequadas ao programa.
4. Autoriza o vínculo; se houver convite pendente, o acesso só fica ativo depois do aceite definido pelo produto.
5. O backend verifica o vínculo ativo em toda operação protegida.

Quando o mesmo profissional trabalha em A e B, são dois vínculos de acesso independentes para a mesma identidade. Revogar o vínculo em A não pode revogar o vínculo em B.

O sistema deve evitar contas duplicadas para a mesma pessoa. Convites devem associar-se a uma identidade existente quando possível e não devem expor códigos de acesso, senhas ou credenciais de outros usuários.

## 6. Troca de programa dentro da plataforma

A interface deve oferecer um seletor de programa simples e persistente, disponível no contexto principal da aplicação.

Regras:

- Mostrar somente programas aos quais o usuário tem acesso ativo.
- Se houver um único programa autorizado, entrar nele diretamente ou manter uma seleção sem exigir uma etapa extra.
- Se houver vários, permitir selecionar o programa desejado e, quando apropriado, lembrar o último programa utilizado.
- Ao trocar, atualizar o contexto de trabalho e carregar os dados do programa selecionado.
- Não exigir novo login apenas para trocar de programa.
- Não confundir troca de contexto com concessão de permissão.
- Se o acesso tiver sido revogado, impedir a entrada no programa e atualizar a lista de programas acessíveis.

A seleção de programa no frontend é conveniência de navegação, não mecanismo de segurança.

## 7. Regras obrigatórias de segurança

1. **Autorização server-side:** toda leitura ou escrita deve verificar a sessão, o programa-alvo e o vínculo/permissão correspondente.
2. **Não confiar no cliente:** enviar um identificador de programa ou selecioná-lo na interface não prova que o usuário pode acessá-lo.
3. **Isolamento por programa:** episódios, produções, agenda, biblioteca, participantes, assets, configurações e demais dados operacionais devem respeitar o programa correto.
4. **Privilégio mínimo:** a função de um profissional deve conceder apenas as operações necessárias naquele programa.
5. **Autoridade limitada:** um diretor executivo só pode administrar a equipe e as permissões dos programas sob sua responsabilidade, salvo uma permissão administrativa global explicitamente definida.
6. **Revogação localizada:** revogar um vínculo não deve afetar os demais programas do usuário.
7. **RLS e backend:** as políticas do banco e as verificações da API devem ser coerentes. A interface sozinha nunca é suficiente.
8. **Auditoria:** mudanças relevantes de acesso devem registrar ator, programa, alvo e momento, conforme a capacidade de auditoria definida pelo projeto.
9. **Sem elevação implícita:** pertencer à organização, ter uma assinatura, ser membro de outro programa ou conhecer um identificador não concede automaticamente acesso.
10. **Administrador técnico:** acesso técnico global, quando necessário, deve ser explícito, restrito e separado da autoridade executiva de cada programa.

## 8. Contratação, assinatura e pagamento

A identidade do usuário e o vínculo de acesso não devem ser confundidos com a contratação comercial.

- Cada programa contratado mantém seu contexto comercial e responsável executivo.
- Um profissional que trabalha em vários programas não precisa comprar uma assinatura pessoal para cada vínculo, a menos que uma regra comercial explícita e aprovada determine isso.
- O acesso de um profissional não deve transferir a propriedade comercial de um programa.
- O estado da assinatura pode afetar o uso do programa conforme as regras comerciais, mas não deve apagar nem transferir os vínculos de outros programas.
- A implementação deve verificar os contratos reais de pagamento e assinatura antes de mostrar status de cobrança ou ativação.

Este documento não define preços, planos, regras de inadimplência ou políticas de faturamento; esses itens precisam permanecer alinhados ao contrato comercial existente.

## 9. Diretrizes para cadastro e login

O fluxo de entrada deve ser único e simples:

- uma identidade por pessoa;
- login único;
- nenhuma escolha obrigatória de organização quando RS Play TV for a única organização operacional;
- nenhuma necessidade de recriar a conta para acessar outro programa;
- nenhum código secreto ou credencial de perfil exposto na interface;
- contratação e setup apresentados ao diretor executivo no contexto do programa que ele está contratando;
- convites e aprovações de acesso tratados como ações explícitas.

O sistema deve distinguir claramente: criar conta, autenticar, contratar programa, configurar programa, convidar usuário e autorizar vínculo.

## 10. Relação com o modelo de dados atual

A hierarquia conceitual pretendida é:

- RS Play TV (organização)
  - Programa A (diretor executivo A)
    - contratação/assinatura do Programa A
    - vínculos de usuários e permissões de A
  - Programa B (diretor executivo B)
    - contratação/assinatura do Programa B
    - vínculos de usuários e permissões de B
- Usuário X
  - vínculo autorizado com Programa A
  - vínculo autorizado com Programa B

Antes de implementar, mapear as tabelas e relações existentes, incluindo organizações, membros, programas, responsáveis executivos, assinaturas e permissões. O esquema real pode já representar parte do contrato; não criar tabelas ou papéis duplicados sem necessidade comprovada.

A existência de registros de organizações adicionais no banco não autoriza exclusão automática. Primeiro identificar seus vínculos, dados dependentes e eventual uso. Qualquer consolidação exige plano de migração reversível, preservação de IDs e revisão explícita.

## 11. Interface esperada

### Para o diretor executivo

- Visão dos programas sob sua responsabilidade.
- Configuração e dados comerciais do programa contratado.
- Gestão da equipe daquele programa.
- Ações explícitas para convidar, autorizar, alterar permissões e revogar acesso.
- Indicação clara do programa que está sendo administrado.

### Para o profissional da equipe

- Uma conta e uma sessão.
- Lista dos programas autorizados.
- Seletor de programa acessível no espaço de trabalho.
- Função e permissões aplicadas conforme o programa ativo.
- Mensagem clara quando um programa não estiver mais disponível por revogação ou outro estado de acesso.

Evitar duplicar menus de organização e programa sem necessidade. O seletor principal de trabalho deve refletir os programas autorizados.

## 12. Plano de trabalho, sem execução nesta etapa

Esta documentação não autoriza mudanças de código, banco ou produção. A sequência futura recomendada é:

1. **Entender:** mapear implementação e dados atuais de cadastro, login, organizações, programas, responsáveis, membros, permissões e assinaturas.
2. **Preservar:** documentar vínculos atuais e riscos; não excluir nem reatribuir dados por suposição.
3. **Definir contratos:** reconciliar o modelo aqui descrito com o esquema e as APIs existentes; especificar o comportamento canônico.
4. **Implementar:** ajustar onboarding, gestão de equipe, autorização server-side e seletor de programas com alterações pequenas e revisadas.
5. **Validar depois, mediante autorização:** testar cenários de dois diretores executivos, profissional compartilhado, isolamento de dados, revogação localizada e contratação independente.

Conforme a instrução atual, **não executar testes nesta fase**. Também não alterar o banco nem remover as organizações adicionais durante a documentação.

## 13. Critérios de aceite futuros

O modelo estará implementado quando:

- dois diretores executivos puderem contratar e configurar programas de forma independente;
- um mesmo usuário puder ter acesso autorizado a ambos os programas;
- o usuário puder alternar entre eles sem novo login;
- cada diretor executivo puder gerir apenas os acessos sob sua responsabilidade;
- o acesso a um programa não conceder acesso a outro;
- a revogação em um programa preservar os outros vínculos válidos;
- APIs e políticas do banco impedirem acesso a dados de programas não autorizados;
- a identidade, os dados existentes e os estados comerciais forem preservados durante a evolução.

---

**Referência de governança:** esta especificação complementa o estado canônico e as decisões arquiteturais do TakeMaster V2. Se a implementação atual divergir, registrar a divergência e planejar a correção; não declarar o comportamento implementado até que seja verificado.
