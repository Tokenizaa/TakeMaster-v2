# TakeMaster V2 — Roadmap de Reconstrução e Estabilização

> Documento-base da V2.
> Objetivo: reconstruir o TakeMaster a partir da melhor base inicial da aplicação, incorporando as evoluções comprovadas da V1 sem carregar sua dívida arquitetural.

## 1. Premissa

A V2 não deve ser tratada como uma cópia reduzida da V1.

A análise do histórico mostra que a V1 nasceu sobre a mesma base funcional que hoje existe na V2 e, ao longo do crescimento, recebeu persistência, autenticação, catálogo, agenda, biblioteca, onboarding, observabilidade e diversas correções.

Isso torna a V1 uma fonte valiosa de conhecimento sobre o que o produto precisou para amadurecer — mas não uma arquitetura que deva ser copiada integralmente.

**Diretriz principal:**

> **V2 = melhor base original + aprendizados comprovados da V1 + arquitetura intencional + contratos estáveis.**

## 2. Objetivos da V2

### Produto

- Manter o núcleo editorial e de produção que já funciona.
- Tornar o fluxo de produção compreensível do início ao fim.
- Separar claramente conteúdo editorial, operação e infraestrutura.
- Evitar que funcionalidades operacionais contaminem o editor de episódio.
- Permitir evolução futura sem reconstruções sucessivas.

### Engenharia

- Uma fonte de verdade para cada domínio.
- Contratos de dados explícitos.
- Persistência confiável.
- Autenticação e autorização desde a fundação.
- Validação de entrada e saída.
- Testes dos fluxos críticos.
- Observabilidade mínima antes de produção.
- Deploy reproduzível.
- Nenhuma funcionalidade crítica dependente de estado local ou fixtures.

### Arquitetura

A V2 deve privilegiar:

1. domínio claro;
2. contratos pequenos;
3. composição sobre acoplamento;
4. persistência relacional;
5. segurança no backend;
6. migrações versionadas;
7. compatibilidade deliberada, não acidental.

## 3. O que preservar da V2 inicial

A V2 atual representa a base conceitual que queremos proteger.

### Núcleo editorial

- Programas/Shows.
- Episódios.
- Convidados/Participantes.
- Diagnóstico editorial.
- Pesquisa.
- Pauta/Outline.
- Perguntas.
- Repiques/Follow-ups.
- Roteiro.
- Câmeras.
- Assets.
- Shorts.
- Marcadores de gravação.
- Checklist técnico.
- Modo estúdio.
- Exportação.
- Assistente de IA.

### Modelo de domínio

A estrutura atual de Show, Episode, Guest e os objetos editoriais deve ser tratada como ponto de partida, não como contrato definitivo.

Antes de migrar para produção, cada entidade deverá ter:

- identidade;
- proprietário/contexto;
- timestamps;
- regras de validação;
- relacionamentos;
- ciclo de vida;
- política de acesso.

## 4. O que a V1 ensinou e deve voltar para a V2

### P0 — Fundação

Estas capacidades são consideradas estruturais:

- Supabase/PostgreSQL como persistência principal.
- Autenticação.
- Sessão de usuário.
- Autorização no backend.
- Isolamento por organização/contexto.
- Isolamento por programa.
- Migrações SQL versionadas.
- Validação de payloads.
- Tratamento consistente de erros.
- Autosave confiável.
- Health check.
- Logging estruturado.
- Testes de integração dos fluxos críticos.

### P1 — Operação

- Catálogo de programas.
- Agenda de produção.
- Biblioteca de assets.
- Dashboard operacional.
- Relação entre programa, produção e episódio.
- Histórico e contexto de produção.

### P2 — Maturidade

- Monitoring mais completo.
- Testes de regressão de onboarding.
- Testes de autorização.
- Testes de persistência/reload.
- Browser smoke tests.
- Estratégia de deployment.
- Documentação operacional.
- Auditoria de dados e fixtures.

## 5. O que NÃO deve ser portado automaticamente

A V1 contém soluções que surgiram para resolver problemas criados pelo próprio crescimento do sistema.

Não copiar sem revisão:

- aliases excessivos entre modelos;
- compatibilidade com IDs legados quando não houver necessidade real;
- mapeamentos duplicados;
- contratos HTTP históricos sem justificativa;
- regras temporárias de onboarding;
- complexidade de Worker/Express quando uma fronteira mais simples resolver;
- fixtures misturadas com dados reais;
- lógica de autorização apenas no frontend;
- fallback silencioso que transforma dados inválidos em dados aparentemente válidos;
- qualquer camada criada apenas para manter código antigo funcionando.

**Regra:** toda peça trazida da V1 precisa responder qual problema ela resolve na V2.

## 6. Arquitetura-alvo

### Camadas

UI → Application/API → Domain → Persistence/Infrastructure

#### UI

Responsável por:

- apresentação;
- interação;
- estado transitório;
- navegação;
- feedback ao usuário.

Não deve conhecer regras de autorização, SQL ou detalhes de persistência.

#### Application/API

Responsável por:

- autenticação da requisição;
- autorização;
- validação;
- orquestração;
- contratos HTTP;
- tratamento de erros.

#### Domain

Responsável por:

- regras de negócio;
- estados;
- transições;
- invariantes;
- operações editoriais.

#### Persistence/Infrastructure

Responsável por:

- Supabase;
- PostgreSQL;
- storage;
- IA;
- serviços externos;
- logging/monitoring.

## 7. Modelo de contexto

A V2 deve estabelecer explicitamente a hierarquia:

Usuário → Organização → Programa → Produção → Episódio

Quando aplicável:

Episódio → Participantes / Conteúdo / Operação / Assets

Nenhum endpoint de negócio deve depender apenas de um ID recebido pelo cliente para determinar acesso.

A autorização deve derivar do contexto autenticado e dos relacionamentos persistidos.

## 8. Roadmap por fases

## Fase 0 — Baseline e arquitetura

**Objetivo:** congelar o entendimento antes de alterar o núcleo.

Entregas:

- [x] Documentar a premissa V1 → V2.
- [x] Criar este roadmap.
- [ ] Comparar modelos V1/V2 entidade por entidade.
- [ ] Definir contratos canônicos da V2.
- [ ] Identificar funcionalidades que serão mantidas, redesenhadas ou descartadas.
- [ ] Definir arquitetura de módulos.
- [ ] Criar ADR inicial.

Critério de saída:

> Não existir dúvida relevante sobre qual é o modelo canônico da V2.

## Fase 1 — Fundação de dados e segurança

**Objetivo:** substituir a persistência provisória por uma base confiável.

Entregas:

- [ ] Configuração Supabase.
- [ ] Schema inicial.
- [ ] Migrações SQL.
- [ ] Usuários/organizações.
- [ ] Programas e acesso a programas.
- [ ] Episódios.
- [ ] Participantes.
- [ ] Relações episódio/participante.
- [ ] Estruturas editoriais.
- [ ] RLS/políticas.
- [ ] Serviço server-side de persistência.
- [ ] Contratos de API.
- [ ] Validação de payloads.
- [ ] Erros padronizados.

Critério de saída:

> Um usuário autenticado consegue criar, editar, recarregar e recuperar um episódio sem depender de db.json.

## Fase 2 — Migração do núcleo editorial

**Objetivo:** manter a experiência boa da V2 enquanto a infraestrutura fica robusta.

Entregas:

- [ ] Shows.
- [ ] Episodes.
- [ ] Guests/Participants.
- [ ] Diagnosis.
- [ ] Research.
- [ ] Outline.
- [ ] Questions.
- [ ] Follow-ups.
- [ ] Script.
- [ ] Cameras.
- [ ] Assets.
- [ ] Shorts.
- [ ] Recording markers.
- [ ] Technical checklist.
- [ ] Script versions.
- [ ] Studio mode.

Critério de saída:

> O fluxo completo de criação → pauta → roteiro → gravação funciona com persistência real e reload.

## Fase 3 — Operação

**Objetivo:** recuperar os recursos que deram maturidade operacional à V1.

Entregas:

- [ ] Catálogo de programas.
- [ ] Agenda.
- [ ] Biblioteca.
- [ ] Dashboard operacional.
- [ ] Contexto de produção.
- [ ] Relacionamento entre agenda, programa e episódio.
- [ ] Gestão de assets.

Critério de saída:

> A plataforma deixa de ser apenas um editor de episódios e passa a representar a operação de produção.

## Fase 4 — IA confiável

**Objetivo:** manter a IA como acelerador, não como fonte silenciosa de corrupção de dados.

Entregas:

- [ ] Contratos tipados para cada saída de IA.
- [ ] Validação runtime.
- [ ] Tratamento de respostas inválidas.
- [ ] Fallback explícito.
- [ ] Registro de erros.
- [ ] Controle de contexto enviado ao modelo.
- [ ] Versionamento de prompts quando necessário.
- [ ] Separação entre geração e persistência.

Regra:

> A IA pode sugerir ou gerar dados; a aplicação continua responsável por validar e persistir esses dados.

## Fase 5 — Qualidade e observabilidade

**Objetivo:** tornar regressões detectáveis antes do usuário.

Entregas:

- [ ] Testes unitários de domínio.
- [ ] Testes de API.
- [ ] Testes de autorização.
- [ ] Testes de persistência.
- [ ] Testes de autosave.
- [ ] Testes de reload.
- [ ] Testes de onboarding.
- [ ] Browser smoke test.
- [ ] Health check.
- [ ] Logs estruturados.
- [ ] Métricas mínimas.

Critério de saída:

> Uma alteração importante consegue ser validada automaticamente nos fluxos críticos.

## Fase 6 — Produção

**Objetivo:** colocar a V2 em produção sem repetir o padrão de crescimento desorganizado da V1.

Entregas:

- [ ] Environment matrix.
- [ ] Secrets.
- [ ] Migration procedure.
- [ ] Backup/recovery procedure.
- [ ] Deployment procedure.
- [ ] Rollback procedure.
- [ ] Runtime health check.
- [ ] Observabilidade.
- [ ] Documentação operacional.
- [ ] Checklist de release.

## 9. Regras de desenvolvimento da V2

### Regra 1 — Não adicionar feature sem definir seu domínio

Antes de implementar uma feature:

- qual entidade ela pertence?
- quem pode acessá-la?
- onde persiste?
- qual API expõe?
- como será testada?

### Regra 2 — Não corrigir arquitetura com mais uma camada de compatibilidade

Se um contrato estiver errado:

1. identificar o contrato canônico;
2. corrigir a origem;
3. migrar os consumidores;
4. remover a compatibilidade temporária.

### Regra 3 — Frontend não é segurança

Tudo que envolve acesso a dados deve ser validado no backend/persistência.

### Regra 4 — Fixtures não são banco

Dados demonstrativos devem ser claramente separados de dados reais.

### Regra 5 — Autosave só informa sucesso após persistência confirmada

Erro de persistência nunca pode resultar em UI dizendo que o conteúdo foi salvo.

### Regra 6 — Toda nova infraestrutura precisa de teste mínimo

Se adicionarmos:

- autenticação → teste de acesso;
- persistência → teste de reload;
- autorização → teste negativo;
- endpoint → teste de contrato;
- IA → teste de schema;
- deploy → smoke test.

### Regra 7 — Preferir remoção a acúmulo

Quando uma solução nova torna uma camada antiga desnecessária, a camada antiga deve ser removida.

## 10. Matriz de decisão para reaproveitamento da V1

| Área | V1 | Decisão V2 |
|---|---|---|
| Modelo editorial | Forte | Preservar e normalizar |
| Supabase | Maduro | Reaproveitar conceito, redesenhar integração |
| Mappers | Necessários na V1 | Minimizar |
| Auth | Necessário | Incorporar desde a fundação |
| Autorização | Evoluiu ao longo do tempo | Projetar desde o início |
| Catálogo | Evolução importante | Reaproveitar |
| Agenda | Evolução importante | Reaproveitar |
| Biblioteca | Evolução importante | Reaproveitar |
| Monitoring | Evolução importante | Reaproveitar |
| Testes | Parcialmente maduros | Ampliar |
| Worker/runtime | Resultado de evolução | Reavaliar |
| Dados demo | Úteis para desenvolvimento | Separar rigorosamente |
| Compatibilidade legada | Útil na migração | Evitar como arquitetura permanente |
| IA | Forte funcionalmente | Preservar + validar runtime |
| Editor de episódio | Núcleo | Preservar |

## 11. Critério de sucesso da V2

A V2 será considerada arquiteturalmente saudável quando:

1. um novo desenvolvedor consegue entender o fluxo principal sem conhecer a história da V1;
2. cada domínio tem uma fonte de verdade;
3. o acesso aos dados é seguro independentemente da UI;
4. salvar e recarregar produz o mesmo estado;
5. os fluxos críticos possuem testes;
6. erros de infraestrutura são visíveis;
7. novas features não exigem novas camadas de compatibilidade;
8. remover uma feature não deixa dependências ocultas espalhadas pelo sistema;
9. o deploy é reproduzível;
10. a documentação explica **por que** a arquitetura existe, não apenas como executar comandos.

## 12. Decisões registradas

### ADR-001 — V2 não será um fork funcional da V1

**Status:** Aceita

A V1 é tratada como fonte de aprendizado e de componentes comprovados, não como arquitetura final.

### ADR-002 — O modelo editorial inicial da V2 é preservado

**Status:** Aceita

A estrutura editorial existente é a base do produto e será fortalecida pela infraestrutura, não substituída sem necessidade.

### ADR-003 — Persistência real entra antes da expansão funcional

**Status:** Proposta

Antes de adicionar grande quantidade de novas features, a V2 deve possuir autenticação, autorização, persistência, validação e testes mínimos.

### ADR-004 — Compatibilidade legada é temporária

**Status:** Proposta

Compatibilidade com estruturas antigas somente será criada quando houver uma necessidade concreta de migração. Não será utilizada como substituto para um modelo canônico bem definido.

## 13. Próximos marcos

### Marco 1 — Architecture Baseline

- Comparativo V1/V2 completo.
- Modelo canônico.
- ADR inicial.
- Mapa de dependências.
- Decisão de persistência.

### Marco 2 — Stable Core

- Auth.
- Organization/program context.
- Supabase.
- Episodes.
- Participants.
- Autosave.
- Validation.
- Tests.

### Marco 3 — Production Workspace

- Agenda.
- Library.
- Catalog.
- Dashboard.

### Marco 4 — Production Ready

- Monitoring.
- Browser validation.
- Deployment.
- Recovery.
- Documentation.

## 14. Princípio final

A V1 mostrou o que o produto precisava.

A V2 deve transformar esse aprendizado em arquitetura.

**Não queremos reconstruir tudo que a V1 fez. Queremos reconstruir o que provou valor, corrigir o que gerou instabilidade e eliminar o que só existe por causa da história da V1.**
