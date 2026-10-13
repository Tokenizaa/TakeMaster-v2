# Evidência DISCOVERY — p1-editorial-flow
Timestamp: 2026-10-05T17:49:52-03:00
Commit: f20b574a594ba7a28280db8a04db110e5f8ac76a

## Comandos de validação (saída real)
### npm run lint
PASS (tsc --noEmit, sem saída de erro)

### npm test  (via npx tsx --env-file=.env --test tests/v2.integration.test.ts)
tests 4 | pass 4 | fail 0  — Supabase canônico cvyoumtywnyayceoezru, 4.8s

### npm run build
PASS — 1749 modules, built in 18.61s, único warning chunk>500kB (conhecido)

## Root cause npm test 'FAIL': tsx não carrega .env
Comando: npx tsx -e 'process.env.SUPABASE_URL'  => undefined
Comando: npx tsx --env-file=.env -e 'process.env.SUPABASE_URL' => https://cvyoumtywnyayceoezru.supabase.co
=> O erro 'supabaseUrl is required' é ausência de carregamento de .env, NÃO ausência de configuração Supabase.

## BLOCKER (infraestrutura Supabase, não código)
GET /auth/v1/admin/users?page=1&per_page=1 -> 200
GET /auth/v1/admin/users?page=1&per_page=2 -> 500 'Database error finding users'
Mesmo service_role key: PostgREST 200, GoTrue /settings 200, GoTrue anon 200.
=> Falha server-side do GoTrue ao materializar >1 usuário. auth.admin.listUsers({perPage:1000}) sempre falha.
=> /api/auth/login retorna PERSISTENCE_ERROR. Bloqueia gate visual + itens 9,10,11.

## Evidência positiva (itens 4,5,6) — funções puras, sem auth
generateProgramEditorialIdentity(base ausente) => essencia/publico/tom/temas/diferenciais = 'não identificado na base'
modelUsed = nvidia/nemotron-3-super-120b-a12b | usedFallback = false
generateProgramPitchSuggestions(sem entrada) => queryUsed='Quero ideias de pautas para este programa.' pautas=3
Chaves de pauta: title, hook, score, fit, reason, angle, suggestedGuest, questions

## Knowledge base
listKnowledgeBasePrograms() => 107 programas
resolveProgramKnowledge() com slug inexistente => coverageLevel='cadastro_interno', fontes=1, todos campos textuais 'não identificado na base'

## CHECKPOINT-005 é NÃO CONFIÁVEL (3 falsificações observadas)
1. Declarou 'npm test FAIL por falta de config Supabase' — FALSO: 4/4 PASS; causa real é tsx sem .env
2. Citou src/server/server.ts — arquivo NÃO EXISTE (entry real: server.ts na raiz)
3. Untracked + auto-aprovado, viola human_gate_required=true
