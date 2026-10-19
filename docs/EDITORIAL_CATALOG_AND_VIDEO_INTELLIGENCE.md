# Catálogo editorial RS Play e inteligência de vídeos

## Escopo de entrega

Este fluxo não considera três programas uma cobertura completa. A coleta deve reconciliar:
1. sitemap e links internos do domínio oficial `rsplay.com.br` e `www.rsplay.com.br`;
2. páginas de programas, grade, mídia kit e links sociais oficiais descobertos;
3. catálogo do banco e arquivos `programs/inventory.json` / `programs/*`;
4. vídeos dos canais oficiais e perfis públicos confirmados.

Os 46 registros atuais são um ponto de partida, não a lista definitiva. Os registros `programa-editorial-N` são placeholders e não podem ser apresentados como programas reais nem apagados automaticamente: devem ser classificados em relatório de reconciliação e só então arquivados/substituídos mediante evidência.

## Modelo de dados

A migration `20261019000001_add_editorial_sources_and_video_intelligence.sql` cria estruturas aditivas:
- `program_catalog_sources`: proveniência e evidência das fontes;
- `program_videos`: inventário idempotente de vídeos;
- `video_transcripts`: transcrições originais versionadas e segmentos com timestamps;
- `video_editorial_analyses`: sínteses separadas do texto original.

RLS fica habilitado sem políticas públicas permissivas. A aplicação deverá usar a autenticação e autorização editorial existentes; nunca expor a chave service-role no navegador.

## Coleta reproduzível

Executar o crawler local:

```bash
bun run tsx scripts/rsplay-catalog-scrape.ts
```

Configurações opcionais: `RSPLAY_SCRAPE_MAX_PAGES`, `RSPLAY_SCRAPE_DELAY_MS`, `RSPLAY_SCRAPE_OUT`. O resultado é um artefato JSON com URLs, metadados, hash, timestamps, links internos e IDs de vídeo encontrados. Ele não altera o banco.

Depois da coleta, revisar o artefato em modo dry-run:

```bash
bun run tsx scripts/rsplay-catalog-import.ts
```

A importação real exige revisão explícita do relatório e execução local segura com as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`:

```bash
bun run tsx scripts/rsplay-catalog-import.ts --apply
```

Novos candidatos entram inativos e com `validation_status: needs_review`; registros existentes preservam valores manuais e só recebem campos que estejam vazios. Não executar `--apply` antes de aplicar e validar a migration no ambiente local/controlado.

O crawler é uma etapa de descoberta, não uma declaração automática de cobertura completa. O relatório deve ser confrontado com sitemap, grade oficial, canais oficiais e catálogo atual. Identidades ambíguas precisam de revisão humana.

## Regras editoriais

- Nunca inventar programa, apresentador, métrica, transcrição ou legenda.
- Guardar a URL e a data da fonte junto a cada dado coletado.
- Deduplicar URLs canônicas e IDs externos de plataforma.
- Vídeo sem legenda deve permanecer registrado com status `unavailable` ou `restricted`; não fabricar texto.
- Preservar transcrições por hash/versão; análise de IA sempre referencia a transcrição e trechos/timestamps.
- Afirmações extraídas são itens a verificar, não fatos automaticamente confirmados.
- Reexecução idempotente e relatório de inserções, atualizações, conflitos e lacunas são critérios obrigatórios.
