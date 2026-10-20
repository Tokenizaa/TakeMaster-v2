# Fase 2 — Registro de implementação da suíte E2E

**Status:** implementação inicial registrada; fase ainda não concluída nem certificada por execução.

## Commits desta entrega

- `57223d9` — primeira suíte de certificação substituta.
- `4a6f318` — comandos Playwright no `package.json`.
- `741a029` — configuração exige `E2E_BASE_URL`; remove fallback para localhost e inicialização automática de servidor.
- `0078f93` — endpoints dos testes alinhados às rotas existentes.

## Segurança de execução

- A suíte não define URL local por padrão.
- A configuração exige que `E2E_BASE_URL` seja fornecida pelo ambiente.
- Os testes atuais não fazem cadastro, criação de usuários, alterações de assinatura nem cobranças.
- As verificações de mutação enviam requisições sem autenticação e validam a barreira de autorização.
- O PIX real de R$ 2,00 continua fora da automação e depende de autorização manual do usuário.
- Não foi executada nenhuma bateria nesta entrega.

## Casos implementados

| Identificador | Cobertura |
|---|---|
| PLATFORM-001..002 | Health endpoint e tipo de conteúdo |
| AUTH-001..004 | Sessão sem token, troca de organização sem token, validação de troca e login inválido |
| AUTHZ-SHOWS-001 | Leitura de programas sem autenticação |
| AUTHZ-EPISODES-001 | Leitura de episódios sem autenticação |
| AUTHZ-PRODUCTIONS-001 | Leitura de produções sem autenticação |
| AUTHZ-GUESTS-001 | Leitura de convidados sem autenticação |
| AUTHZ-SCHEDULE-001 | Leitura de agenda sem autenticação |
| AUTHZ-LIBRARY-001 | Leitura de biblioteca sem autenticação |
| AUTHZ-BILLING-001 | Leitura de assinatura sem autenticação |
| AUTHZ-ADMIN-001 | Leitura administrativa sem autenticação |
| AUTHZ-KNOWLEDGE-BASE-001 | Acesso à base de conhecimento sem autenticação |
| VENOPAG-001..004 | Limites de acesso anônimo para leitura, assinatura, renovação automática e renovação manual |
| ADMIN-GLOBAL-001..002 | Limites de acesso anônimo para visão administrativa e criação de usuário |
| AI-001 | Geração de diagnóstico sem autenticação |
| UI-001..002 | Entrada da aplicação e ausência de erros de página no navegador |

## Cobertura que ainda precisa ser implementada antes da execução integral

A camada atual é principalmente de limites de autorização anônima e smoke test; **não representa a cobertura funcional completa exigida**. Ainda faltam jornadas autenticadas com identidades de teste isoladas, incluindo:

- cadastro, autenticação bem-sucedida, logout, persistência/expiração de sessão e recuperação de acesso;
- onboarding completo e primeiro acesso;
- rotinas do administrador geral e administradores de organização;
- gestão de organizações, membros, papéis, permissões, limites e isolamento entre organizações;
- criação, leitura, atualização e relacionamentos de programas, temporadas, episódios e participantes;
- produção, agenda, biblioteca, estúdio e fluxos operacionais da interface;
- contratos de IA, credenciais/fallback, limites e respostas inválidas;
- persistência da base de conhecimento;
- assinatura e ciclo de pagamento com gateway estritamente simulado, webhooks, idempotência, cancelamento e revogação/concessão de acesso;
- recuperação de falhas e evidências detalhadas por cenário.

## Critério de conclusão

A Fase 2 só estará concluída quando todos os fluxos aplicáveis acima estiverem implementados, revisados em conjunto, executados na bateria completa e acompanhados de evidências reais. Não declarar aprovação com base apenas em compilação, existência dos arquivos ou testes não executados.
