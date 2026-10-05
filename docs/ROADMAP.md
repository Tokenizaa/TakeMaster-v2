# TakeMaster V2 — Roadmap Atual

Este documento substitui roadmaps históricos. Ele descreve somente o trabalho ainda relevante.

## Concluído

### Fundação
- Supabase como persistência canônica.
- Auth server-side.
- Isolamento por organização/programa.
- Contratos e validação de API.
- Mapeamento de compatibilidade legado na persistência.
- Seeds/fallbacks locais removidos da execução produtiva.

### Operação
- Programas.
- Produções/Temporadas.
- Episódios.
- Participantes.
- Agenda.
- Biblioteca.
- Relações de organização → programa → produção → episódio.

### IA
- NVIDIA NIM.
- Modelo primário + fallback.
- JSON estrito.
- Validação runtime.
- Identidade editorial baseada em knowledge base.
- Sugestão contextual de pautas.
- Persistência de gerações em `ai_generations`.

### Qualidade
- TypeScript/lint validado.
- Teste de integração Supabase validado.
- Build validado.

## Em andamento — prioridade P0/P1/P2

### P0 — Contratos e integridade
- Auditoria final das rotas API.
- Auditoria dos contratos frontend/backend.
- Verificação de isolamento e registros órfãos.
- Revisão final de RLS sem alterar funções de segurança de forma especulativa.

### P1 — Editorial
- Validar Programa → Identidade → Pautas → Episódio.
- Validar uso da knowledge base RS Play.
- Completar crosswalk Programa operacional ↔ catálogo ↔ knowledge base.
- Confirmar persistência e recuperação das gerações editoriais.

### P2 — Frontend e E2E
- Remover mocks/localStorage/fallbacks restantes.
- Padronizar estados de UI.
- Validar contexto central de Programa.
- Executar fluxo real:
  Login → Programa → Identidade → Pauta → Usar na produção → Episódio → Save → Reload.

## Depois dos gates

Somente após os fluxos acima estarem comprovados:

- melhorias de UX;
- otimizações de bundle;
- novas features de produção;
- evolução comercial.

Não criar uma nova fase apenas para renomear tarefas.

## Critério de avanço

Uma tarefa só é considerada concluída quando houver evidência no código/teste/ambiente correspondente. Documentação não substitui validação.
