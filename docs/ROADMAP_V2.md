# TakeMaster V2 — Roadmap

Este arquivo mantém o nome histórico por compatibilidade. O roadmap atual é intencionalmente curto.

## Concluído

- Supabase como persistência canônica.
- Auth server-side e isolamento por organização/programa.
- Programas, Produções/Temporadas, Episódios e Participantes.
- Agenda e Biblioteca.
- NVIDIA NIM com primário/fallback.
- JSON estrito e validação runtime de IA.
- Knowledge base → identidade editorial → sugestões de pautas.
- Persistência de gerações editoriais em `ai_generations`.
- Lint, testes de integração e build validados.

## Próxima sequência

### P0
- Auditar frontend ↔ API.
- Validar contratos reais.
- Validar isolamento e possíveis órfãos.
- Revisar RLS sem introduzir regressões.

### P1
- Completar crosswalk Programa operacional ↔ catálogo RS Play ↔ knowledge base.
- Validar Programa → Identidade → Pautas → Episódio.
- Confirmar persistência/recuperação das gerações editoriais.

### P2
- Remover mocks/localStorage/fallbacks restantes.
- Padronizar estados da UI.
- Executar E2E: Login → Programa → Identidade → Pauta → Usar → Episódio → Save → Reload.

## Regra

Nenhuma nova arquitetura ou feature deve ser criada antes dos gates acima, salvo necessidade comprovada por evidência.
