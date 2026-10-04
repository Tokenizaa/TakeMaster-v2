# Mapa Canônico de Testes - TakeMaster V2

Este documento descreve o mapa canônico de testes para o projeto TakeMaster V2, servindo como contrato para garantir que a cobertura de teste seja adequada e que os testes sejam executáveis e verificáveis.

## 1. Visão Geral

O mapa de testes canônico define:
- Quais testes devem existir e serem executáveis
- A estrutura organizacional dos testes
- Os critérios de saída para cada nível de teste
- As dependências e configurações necessárias

## 2. Estrutura de Testes

### 2.1 Níveis de Teste
1. **Testes Unitários**: Testam funções, classes e módulos em isolamento.
2. **Testes de Integração**: Testam a integração entre camadas (ex: API → serviço → persistência).
3. **Testes End-to-End (E2E)**: Testam fluxos completos de usuário através da interface.
4. **Testes de Performance**: Testam carga, stress e escalabilidade.
5. **Testes de Segurança**: Testam vulneráveis e proteções.

### 2.2 Organização por Domínio
Testes devem ser organizados por domínio de negócio:
- Autenticação e Autorização
- Gestão de Programs (Shows)
- Gestão de Episodes
- Gestão de Participants (Guests)
- Gestão de Segmentos (OutlineBlocks)
- Gestão de Content (Pesquisa, Diagnóstico, etc.)
- Gestão de Assets e Production Assets
- IA e Integração com NVIDIA
- Operações e Contexto de Produção
- Infraestrutura (CI/CD, Deploy, Monitoring)

## 3. Estado Atual dos Testes

O estado real do repositório não corresponde a uma suíte Jest/Playwright configurada.

### 3.1 Execução canônica disponível
- `npm test` executa `tsc --noEmit`.
- `npm run lint` também executa `tsc --noEmit`.
- Não existem scripts `test:unit`, `test:integracao`, `test:e2e`, `test:performance` ou `test:seguranca` no `package.json`.
- Existem arquivos de teste históricos no repositório, mas eles não devem ser considerados uma suíte canônica executável até serem validados contra a arquitetura atual.

### 3.2 Lacunas reais
- Testes automatizados de persistence Supabase.
- Testes de RLS e autorização allow/deny.
- Testes de contratos e erros da API.
- Testes de integração NVIDIA NIM.
- Testes E2E dos fluxos críticos.
- Cobertura dos relacionamentos filhos do Episode.
- Testes de History/Library após suas implementações canônicas.

## 4. Critérios de Saída para Testes Canônicos

Para que um teste seja considerado canônico, deve:
1. Ser executável em ambiente de CI/local sem intervenção manual.
2. Ter assertivas claras que verificam comportamento específico.
3. Não depender de estado externo não controlado (exceto serviços explícitos como Supabase/NVIDIA quando testando integração real).
4. Ter nomes descritivos que indiquem o que está sendo testado.
5. Ser mantido atualizado conforme o código evolui.
6. Para testes de integração real, usar ambientes isolados (staging) ou dados de teste dedicados.
7. Para testes E2E, usar fluxos de usuário reais com validação de tela e comportamento.

## 5. Configuração Necessária

Para executar os testes canônicos, o projeto deve ter:
- Variáveis de ambiente configuradas para Supabase (URL e chaves).
- Variáveis de ambiente configuradas para NVIDIA NIM (URL e chave).
- Acesso a um banco de dados de teste Supabase (pode ser um projeto separado ou branch).
- Dependências de teste instaladas (Jest, Playwright, etc.).
- Scripts definidos no package.json para executar diferentes níveis de teste.

## 6. Mapas de Testes por Domínio

### 6.1 Autenticação
- Unit tests para middleware de autenticação.
- Unit tests para validação de tokens.
- Integração tests para endpoints protegidos.
- E2E tests para fluxos de login/logout e acesso a rotas protegidas.

### 6.2 Gestão de Programs (Shows)
- Unit tests para services e validators.
- Integração tests para API de programs.
- E2E tests para criação, edição, listagem e exclusão de programs.

### 6.3 Gestão de Episodes
- Unit tests para services e validators (parcialmente implementados).
- Integração tests para API de episodes (parcialmente implementados, mas mockados).
- E2E tests para fluxo completo de episode (criação com IA, edição, associar participantes, segmento, questions, follow-ups, script, assets, etc.).
- Tests específicos para relacionamentos: episode → participants, episode → content, etc.

### 6.4 Gestão de Participants (Guests)
- Similar aos de episodes, adaptado para o domínio de participants.

### 6.5 IA e NVIDIA NIM
- Unit tests para wrappers e utilitários de IA.
- Integração tests reais com NVIDIA NIM (usando modelos de teste ou sandbox).
- Tests para tratamento de erros, timeout, fallback de modelo.
- Tests para validação de respostas de IA antes de entrarem no domínio.

### 6.6 Persistência e Supabase
- Tests para o adapter de persistência Supabase.
- Tests para mapeamento entre domínio e schema do banco.
- Tests para transações e consistência.
- Tests para RLS e políticas de acesso.
- Tests para migrations e versionamento de schema.

### 6.7 Operações e Contexto de Produção
- Tests para funcionalidades de produção, agenda, library, dashboard, etc.
- Similar aos demais domínios.

## 7. Executando Testes Canônicos

### Disponível agora
```bash
npm test
npm run lint
npm run build
```

Esses comandos validam TypeScript e build. Eles não substituem testes unitários, integração, RLS ou E2E.

Os scripts específicos de cada nível só devem ser adicionados quando houver uma suíte realmente configurada e executável.

## 8. Manutenção do Mapa

Este mapa deve ser revisado e atualizado:
- A cada nova funcionalidade adicionada.
- A cada mudança significativa na arquitetura ou domínio.
- Quando novos tipos de teste forem introduzidos.
- Como parte da definição de Done para qualquer feature.

## 9. Estado de Conformidade Atual

- **TypeScript/build:** executáveis.
- **Unitários:** presentes de forma histórica/parcial, sem suíte canônica configurada.
- **Integração real:** não estabelecida como suíte canônica.
- **E2E:** não estabelecido.
- **Persistência/RLS/Authz:** ainda precisam de testes automatizados.
- **NVIDIA NIM:** integração existe, cobertura automatizada ainda não fechada.

Este documento descreve o alvo de qualidade; não deve afirmar que um teste existe ou é executável sem que o `package.json` e a execução local/CI comprovem isso.