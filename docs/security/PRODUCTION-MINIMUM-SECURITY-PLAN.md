# Plano mínimo de segurança para produção — TakeMaster v2

**Escopo:** SaaS em pré-lançamento, até 100 usuários, documentos e dados pessoais/confidenciais, equipe de desenvolvimento de uma pessoa.

**Decisão:** aplicar controles proporcionais ao risco. Não implementar uma arquitetura corporativa por checklist. Este documento é um plano de trabalho e uma leitura estática do código disponível; não é certificação nem afirma que os controles já estão validados.

## Estado confirmado pela leitura do repositório

- A API usa sessões próprias assinadas com HMAC e exige `INTERNAL_SESSION_KEY` para criar sessões. O código rejeita tokens quando a chave está ausente, mas a política de comprimento/entropia da chave deve ser definida e validada.
- A API acessa Supabase pelo servidor com `SUPABASE_SERVICE_ROLE_KEY`; esse segredo nunca pode chegar ao bundle do navegador ou aos logs.
- O servidor registra eventos de auditoria por meio da camada de persistência, mas não há evidência nesta leitura de armazenamento WORM independente. Uma tabela/trigger SQL isolada não deve ser chamada de WORM sem proteção contra alteração administrativa.
- A suíte Playwright existe, mas a documentação do repositório indica que a execução integral da Fase 3 continua pendente. Portanto, não há evidência suficiente para declarar os testes aprovados.
- Não foi confirmado nesta leitura que MFA, OIDC Google/Microsoft, restauração de backup ou pentest externo estejam concluídos. Ausência de confirmação não prova ausência de implementação; cada item precisa de evidência.

## 1. Bloqueios técnicos antes de liberar usuários reais

### Identidade e autorização
- [ ] Confirmar autenticação real pelo Supabase Auth e fluxo de recuperação/encerramento de sessão.
- [ ] Exigir MFA para contas administrativas/privilegiadas, preferencialmente por recurso gerenciado do provedor. Não armazenar segredos MFA próprios se o provedor resolver o requisito.
- [ ] Testar no servidor a autorização por organização e por programa em leitura, escrita, exclusão, exportação e acesso a documentos.
- [ ] Confirmar que trocar o identificador de organização no cabeçalho ou na URL não permite acesso cruzado.
- [ ] Definir comprimento mínimo e rotação segura de `INTERNAL_SESSION_KEY`; armazená-la como segredo do ambiente e nunca em arquivos versionados.

### Dados, arquivos e Supabase
- [ ] Revisar RLS/policies e privilégios de todas as tabelas expostas; testar acesso com usuário anônimo e usuário de outra organização.
- [ ] Confirmar que a chave service-role só é usada no servidor.
- [ ] Verificar buckets privados, autorização de upload/download, limites de tamanho/tipo e validade de URLs assinadas.
- [ ] Definir retenção/exclusão de dados e revisar quais dados confidenciais são necessários.
- [ ] Executar um teste de restauração de backup e registrar o resultado.

### Validação de segurança
- [ ] Executar a suíte E2E completa em ambiente remoto explicitamente aprovado, com resultados por ID e evidências. Testes com escrita só em ambiente isolado de teste/staging.
- [ ] Rodar lint/build, análise de dependências e busca de segredos; corrigir achados críticos/altos relevantes antes do lançamento.
- [ ] Não realizar cobrança/PIX real nem chamadas pagas de IA na bateria automatizada.

## 2. Controles condicionais — não construir sem necessidade demonstrada

- **SSO OIDC Google/Microsoft:** adiar até existir exigência de clientes empresariais ou contratual. OIDC não substitui autorização por organização.
- **WORM externo:** adiar salvo obrigação legal/contratual, ameaça interna relevante ou necessidade probatória. Manter auditoria de eventos críticos com permissões restritas, retenção definida e exportação protegida. Não prometer imutabilidade absoluta com apenas uma trigger SQL.
- **Pentest externo anual:** decidir pelo risco, exposição e contratos. Antes do lançamento, priorizar uma avaliação independente direcionada à autenticação, isolamento multi-tenant, documentos e APIs; documentar escopo e remediações. Não tratar uma varredura automatizada como pentest.
- **Security Champions por time:** não se aplica a uma equipe de uma pessoa. Nomear um responsável e usar revisão independente pontual.
- **MFA para todos os usuários:** avaliar a fricção e o risco; no mínimo, tornar MFA obrigatório para administradores e acessos privilegiados.

## 3. Operação contínua simplificada

- [ ] Criar uma política de remediação com prazos iniciais: crítica — contenção imediata e correção prioritária; alta — plano em até 7 dias; média — até 30 dias; baixa — até 90 dias. Ajustar conforme impacto e exposição; registrar exceções com responsável e prazo.
- [ ] Manter procedimento de incidente de uma página: detectar, conter, preservar evidências, recuperar, avaliar obrigações de comunicação e registrar ações.
- [ ] Realizar um exercício tabletop antes do lançamento e repeti-lo anualmente ou após mudanças relevantes; aumentar a frequência se clientes/contratos exigirem.
- [ ] Concluir treinamento prático de secure coding pelo desenvolvedor, registrando data e tópicos; repetir quando houver mudanças relevantes ou incidentes.
- [ ] Rever mensalmente alertas, vulnerabilidades abertas, backups e eventos de acesso privilegiado.

## Implementação técnica registrada em 22/10/2026

- [x] `src/server/auth.ts` rejeita emissão e validação de sessão quando `INTERNAL_SESSION_KEY` tem menos de 32 bytes UTF-8.
- [x] `.env.example` documenta a exigência mínima e o comando sugerido `openssl rand -base64 32`; o segredo real não deve ser versionado.
- [ ] Ainda é necessário confirmar que o valor configurado no ambiente de implantação atende ao mínimo e que a autenticação funciona após a mudança.
- [ ] Build, lint e suíte Playwright não foram executados por esta alteração remota; não marcar como validados até executar e registrar resultados.

## 4. Critérios objetivos de liberação

A liberação só pode ser aprovada quando:
1. Não houver vulnerabilidades críticas ou altas relevantes sem correção ou tratamento formalmente aprovado.
2. Testes demonstrarem isolamento entre organizações e autorização correta em operações sensíveis.
3. Segredos estiverem protegidos e não expostos em código, bundle, logs ou artefatos.
4. Restauração de backup tiver sido demonstrada.
5. Testes E2E e build tiverem sido executados; resultados e bloqueios estiverem documentados.
6. Houver responsável, procedimento de incidentes e rotina de remediação definidos.

## 5. Evidências que devem ser anexadas antes do aceite

- Commit/versão validada e comandos executados.
- Resultado do build, lint e Playwright (pass/fail/skipped, por ID).
- Evidência de testes negativos de autorização entre organizações.
- Registro do teste de restauração.
- Lista de vulnerabilidades, severidade, correções e exceções.
- Evidência de MFA privilegiado e configuração segura do ambiente.
- Relatório externo de segurança, se contratado/exigido.

**Status atual:** plano registrado; prontidão de produção NÃO certificada. A leitura via GitHub não executa o código, não acessa segredos/configurações de runtime e não substitui a execução da suíte no ambiente autorizado.
