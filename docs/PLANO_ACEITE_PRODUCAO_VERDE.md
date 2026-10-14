# Plano de aceite — Produção verde

**Estado:** VERDE — aceite executado em 13/10/2026 (America/Sao_Paulo)
**Produção:** https://takemaster-v2.olfnetto.workers.dev
**Commit:** `c88ea3a`
**Worker version:** `dd10264c-c176-45fc-8f6d-d8111e79b118`

Este documento define gates observáveis para declarar o release verde. Não considera “IA configurada” suficiente: exige autenticação, geração real e confirmação de duas credenciais ativas.

## Gates e evidências do aceite atual

| Gate | Critério objetivo | Resultado |
|---|---|---|
| Código | `main` sincronizada, sem mudanças locais | PASS |
| CI | Governança, typecheck, unitários e build do Worker aprovados no GitHub Actions (run `38499743201`) | PASS |
| Testes locais | `lint`, governança, 4 testes unitários e `build:worker`/dry-run aprovados | PASS |
| Credenciais | `NIM_API_KEY` e `NIM_API_KEY_SECONDARY` presentes como Cloudflare secrets; nenhum valor impresso ou versionado | PASS |
| NVIDIA | A primária gerou resposta pela aplicação em produção; a secundária concluiu uma inferência direta HTTP 200; os dois IDs de modelo constam no catálogo | PASS |
| Failover | Helper real recebeu 401 da credencial inválida de teste e obteve 200 com a secundária no endpoint de inferência NVIDIA | PASS |
| Health publicado | `/api/health` HTTP 200, `status=ok`, Supabase conectado, NIM configurado e `credentialFailoverConfigured=true` | PASS |
| Fluxo do usuário | Login E2E, `/api/state` e `/api/ai/diagnosis` com geração real retornaram HTTP 200 | PASS |
| Deploy | Versão acima ativa com 100% do tráfego | PASS |

O failover foi exercitado contra o endpoint NVIDIA com uma credencial primária deliberadamente inválida **apenas no teste isolado**. A credencial primária da produção não foi alterada nem revogada. O Worker em produção foi validado com ambas as secrets presentes e com geração real bem-sucedida.

## Política implementada

- Tentar as credenciais na ordem `NIM_API_KEY`, `NIM_API_KEY_SECONDARY`.
- Usar a secundária quando a NVIDIA rejeitar a credencial atual com HTTP 401/403.
- Não alternar credenciais em HTTP 429; respeitar rate limits e não contorná-los.
- Manter o fallback de modelo existente, separado do failover de credenciais.
- Nunca registrar valores, prefixos ou fingerprints das chaves.

## Rotação futura da chave NVIDIA

O failover acima não cria, renova ou revoga chaves. Para rotação planejada, sem downtime:

1. Gerar uma nova Personal/Service API Key no NGC, com escopo mínimo para NIM e manter a chave antiga ativa.
2. Atualizar `NIM_API_KEY_SECONDARY` via `wrangler secret put` (não usar `vars`, argumentos com valor ou Git).
3. Verificar health e executar uma geração smoke; manter a primária antiga como caminho de retorno.
4. Promover a nova credencial a `NIM_API_KEY` e manter temporariamente a antiga em `NIM_API_KEY_SECONDARY`.
5. Confirmar geração e logs sem rejeição; só então desativar/remover a chave antiga no NGC.
6. Registrar a data e repetir pelo menos a cada 90 dias para chaves de longa duração, ou antes se houver exposição/expiração.

## Regras para releases seguintes

Repetir todos os gates da tabela após cada release. Se falhar health, login, geração real ou configuração de duas chaves, classificar como **não verde**, interromper a promoção e usar o rollback/versionamento do Wrangler. Não testar failover quebrando a credencial primária no Worker que recebe tráfego; usar teste isolado como o descrito acima.

O aviso existente de bundle JavaScript acima de 500 kB é melhoria de performance não bloqueante para este aceite; deve permanecer como item de otimização separado.
