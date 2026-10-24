# Integração da base editorial ao setup operacional do programa

## Objetivo

Antes de executar o E2E de onboarding ponta a ponta, integrar de forma explícita a base inicial de conhecimento editorial ao setup operacional do programa escolhido. O teste de onboarding só deve ser considerado válido quando provar que o programa criado/associado recebeu uma configuração coerente com sua base real e que o usuário chegou à tela operacional.

## Diagnóstico atual

A implementação observada separa três camadas:

1. **Base editorial capturada**: arquivos por programa, quando disponíveis, em `programs/{slug}` ou `rsplay-knowledge-base/programs/{slug}`, incluindo `profile.json`, `content.md`, `sources.json` e `media.json`.
2. **Setup operacional**: `createDefaultProgramStructure()` cria estrutura genérica (temporada inicial, câmeras padrão, blocos Abertura/Bloco 1/Bloco 2/Encerramento e textos genéricos) e acessos. Esses valores não demonstram personalização a partir da base editorial.
3. **Contexto de IA/consulta**: `resolveProgramKnowledge()` consegue resolver a identidade editorial e fontes separadamente, mas isso não prova que o resultado é persistido e aplicado à configuração operacional do programa durante o onboarding.

Há também um risco de distribuição: o resolvedor procura arquivos no filesystem em diretórios relativos ao diretório de trabalho. A presença e a integridade desses arquivos no artefato executado em produção precisam ser comprovadas; não assumir que os arquivos locais estarão disponíveis no Worker publicado.

## Resultado esperado da etapa

Implementar um fluxo explícito e rastreável:

**programa selecionado → resolução da base real → validação de identidade e fontes → geração de configuração operacional baseada em fatos disponíveis → persistência vinculada ao programa/organização → verificação de integridade → estado pronto para uso.**

Não confundir “setup executado” com “setup personalizado e válido”.

## Requisitos funcionais

- Resolver a base pelo identificador/slug canônico do programa selecionado; não escolher uma base por semelhança ambígua.
- Validar que a base corresponde ao programa selecionado e registrar sua origem, versão/hash quando viável, fontes e lacunas.
- Mapear os dados capturados para configurações operacionais úteis quando houver evidência: identidade e proposta editorial, público, temas, formato, duração, apresentador, quadros, diferenciais e informações comerciais, conforme disponíveis.
- Personalizar estrutura de episódios, blocos, abertura/encerramento, orientação de produção e demais configurações já suportadas pelo domínio do produto somente quando a base justificar a configuração.
- Não inventar dados ausentes nem converter valores genéricos em fatos. Ausências devem ser explícitas; defaults técnicos devem ser identificados como provisórios.
- Persistir a configuração no registro/estrutura operacional correta, com escopo da organização e do programa, sem duplicar dados desnecessariamente nem quebrar isolamento/autorização.
- Preservar o caminho de “Novo Programa Autoral”: quando não houver base editorial externa, usar onboarding próprio e deixar claro quais dados são fornecidos pelo usuário e quais são defaults.
- Definir comportamento de falha: se a base oficial foi selecionada mas está ausente, ilegível, incompatível ou não pode ser empacotada no runtime, não marcar silenciosamente como setup completo. Exibir/registrar erro acionável ou estado de setup incompleto.
- Verificar o empacotamento e a disponibilidade da base no runtime real (incluindo build/deploy do Worker). Escolher uma estratégia compatível com a arquitetura existente; não assumir filesystem local em produção.
- Garantir idempotência: reexecutar setup não deve duplicar temporadas, câmeras, blocos, fontes ou vínculos.
- Não alterar indevidamente autorização, propriedade do programa, equipe ou regras de programas já vinculados a outros usuários.

## Critérios de aceite

1. Existe uma função/serviço de integração claramente identificável, coberta por testes, entre resolução da base editorial e setup operacional.
2. Um programa do catálogo oficial com base válida produz configuração persistida que reflete dados reais daquela base.
3. A configuração pode ser rastreada até as fontes utilizadas; dados ausentes são identificados, nunca fabricados.
4. Um programa sem base ou com base inválida não é falsamente apresentado como setup editorial completo.
5. A estratégia de entrega da base é validada no mesmo runtime/build usado pelo ambiente de destino.
6. Setup repetido é idempotente e respeita isolamento por organização, vínculos e permissões existentes.
7. Um programa autoral continua podendo ser configurado sem mídia kit oficial.
8. Testes automatizados cobrem mapeamento, ausência de dados, incompatibilidade de identidade, falha de leitura/empacotamento, persistência, idempotência e autorização.
9. Um teste integrado comprova o estado persistido no Supabase, não apenas a resposta HTTP ou o estado visual.
10. Somente depois dessa etapa, executar o E2E visual de onboarding: cadastro público real, pagamento simulado sem transação financeira real, seleção do programa, setup automatizado, evidências visuais por etapa e parada na tela operacional pronta para uso.

## Plano de execução para os agentes

O agente local principal deve delegar a investigação e implementação a um subagente com escopo explícito, mantendo para si a integração e validação final. O subagente deve:

1. Ler este documento e inspecionar o fluxo real de cadastro, seleção do programa, criação de organização/programa e setup.
2. Confirmar onde a base editorial vive no repositório, como é incluída no build e como o runtime de produção a acessa.
3. Propor o menor desenho compatível com as tabelas e funções existentes; evitar nova infraestrutura ou duplicação de fontes sem necessidade.
4. Implementar a integração e os testes focados nos critérios de aceite.
5. Entregar ao agente principal arquivos alterados, decisões, riscos, comandos executados e resultados reais dos testes.

O agente principal deve revisar o trabalho, executar verificações aplicáveis, corrigir regressões, verificar o diff e consolidar o resultado no fluxo canônico do repositório. Não encerrar com auditoria apenas: implementar, testar e documentar os resultados. Não iniciar o E2E de cadastro/pagamento até que os critérios de integração e persistência estejam demonstrados.

## Limites e segurança do teste posterior

- Usar o fluxo público de cadastro; não pré-criar usuário, organização ou programa de teste diretamente no banco para simular onboarding.
- Pagamento pode ser simulado por mecanismo explicitamente isolado de teste; nunca efetuar cobrança real.
- Não usar mocks para substituir resolução da base, setup, persistência ou associação do programa.
- Registrar screenshots/vídeo e o último passo concluído; em falha, preservar evidências e estado para diagnóstico sem declarar sucesso.
- Não expor segredos, tokens, credenciais ou dados pessoais nos logs e evidências.

## Definição de concluído

A etapa está concluída quando o código integra a base real ao setup, os testes automatizados e integrados passam, a disponibilidade da base no runtime de destino está comprovada e o estado operacional persistido é verificável. O E2E visual de onboarding é a etapa seguinte, não um substituto para esta integração.
