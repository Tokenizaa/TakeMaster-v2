# Contrato canônico da nova suíte de testes — TakeMaster V2

> **Estado atual:** suíte legada removida na Fase 1. Este documento é o contrato para a reconstrução, não uma declaração de cobertura já implementada.

O inventário da limpeza está em [PHASE-1-INVENTORY-AND-CLEANUP.md](./PHASE-1-INVENTORY-AND-CLEANUP.md).

## Regras obrigatórias

1. Toda funcionalidade existente deve ser mapeada a testes identificáveis por domínio, fluxo e sequência.
2. Cada caso deve declarar pré-condições, dados usados, ação, resultado esperado e evidência verificável.
3. Testes E2E devem cobrir jornadas completas na interface, API e persistência, conforme o objetivo do caso.
4. Casos devem validar sucesso, entradas inválidas, falhas, permissões e limites relevantes.
5. Testes não podem depender de dados compartilhados ou apagar dados preexistentes.
6. Testes de integração remota exigem ambiente e organização de teste explicitamente isolados.
7. Pagamentos VenoPag devem usar simulações controladas para toda a certificação automatizada. Nenhuma suíte automatizada pode iniciar cobrança real.
8. O único PIX real de R$ 2,00 é uma etapa manual final, executada pelo usuário após aprovação das demais fases.
9. Falha exige diagnóstico e, se o teste estiver inadequado, reescrita do teste; não remendo incremental de testes legados.
10. A CI só poderá declarar testes aprovados quando executar a suíte substituta real, sem pular casos críticos silenciosamente.

## Domínios mínimos de cobertura

- Cadastro, autenticação, sessão, logout e recuperação de acesso.
- Onboarding e primeiro acesso.
- Administrador geral e administradores de organização.
- Usuários, organizações, papéis, permissões e isolamento entre organizações.
- Programas, temporadas, episódios, participantes/convidados e relações entre entidades.
- Produções, agenda, biblioteca, modo estúdio e rotinas operacionais existentes.
- IA, credenciais, fallback, erros, limites e validação de respostas.
- Base de conhecimento e persistência.
- Assinaturas, checkout, PIX, notificações, idempotência, cancelamento e concessão/revogação de acesso.
- Segurança, validação de entradas, autorização, consistência, falhas de serviços e recuperação.
- Build, tipagem, configuração, migrations e pipeline de CI/CD.

A lista final de módulos será confirmada contra o código e os fluxos realmente implementados. Documentação de funcionalidade não substitui evidência de teste executado.

## Critérios para cada teste

Cada teste deverá ter identificador estável (por exemplo, `AUTH-001`, `ADMIN-GLOBAL-001`, `PROGRAM-001`, `VENOPAG-001`) e registrar:
- resultado: aprovado, reprovado ou bloqueado;
- evidência e motivo da falha;
- correção realizada na aplicação ou reescrita do teste;
- reexecução após a alteração;
- impacto sobre dados, integrações e permissões.

## Estado de implementação após a Fase 1

- Testes legados: removidos.
- Testes substitutos: ainda não implementados.
- Execução de testes na CI: temporariamente desativada, até a suíte substituta ser criada na Fase 2.
- Build, TypeScript e lockfile: não certificados nesta fase.
- PIX real: proibido até a etapa manual final.
