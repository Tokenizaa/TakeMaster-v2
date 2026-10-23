# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-visual.test.ts >> PLATFORM — saúde e interface pública >> PLATFORM-004 shell inicial não lança erro JavaScript de página
- Location: tests/e2e-visual.test.ts:39:3

# Error details

```
Tearing down "context" exceeded the test timeout of 90000ms.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e13]:
      - generic [ref=e14]: RSPlay TV SaaS
      - paragraph [ref=e15]: RSPlay TV — Rede Broadcast
    - button "Novo Episódio" [ref=e17] [cursor=pointer]
    - navigation [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: Núcleo Editorial
        - button "Painel do Programa" [ref=e23] [cursor=pointer]
        - button "Episódios & Roteiros 0" [ref=e31] [cursor=pointer]:
          - generic [ref=e32]: Episódios & Roteiros
          - generic [ref=e36]: "0"
        - button "Participantes & Convidados 0" [ref=e37] [cursor=pointer]:
          - generic [ref=e38]: Participantes & Convidados
          - generic [ref=e45]: "0"
      - generic [ref=e46]:
        - generic [ref=e47]: Operação & Estúdio
        - button "Catálogo & Temporadas 0" [ref=e48] [cursor=pointer]:
          - generic [ref=e49]: Catálogo & Temporadas
          - generic [ref=e54]: "0"
        - button "Agenda de Produção 0" [ref=e55] [cursor=pointer]:
          - generic [ref=e56]: Agenda de Produção
          - generic [ref=e60]: "0"
        - button "Biblioteca de Assets 0" [ref=e61] [cursor=pointer]:
          - generic [ref=e62]: Biblioteca de Assets
          - generic [ref=e66]: "0"
        - button "Estúdio & Câmeras" [ref=e67] [cursor=pointer]
      - generic [ref=e73]:
        - generic [ref=e74]: SaaS, Planos & Admin
        - button "Assinatura & Gateway" [ref=e75] [cursor=pointer]
        - button "Painel Administrativo" [ref=e80] [cursor=pointer]
    - generic [ref=e87]:
      - generic [ref=e88]: Acesso Master Admin
      - paragraph [ref=e94]: Todos os 0 programas e relatórios liberados.
      - button "Alternar Login de Programa" [ref=e95] [cursor=pointer]
      - button "Sair / Encerrar Sessão" [ref=e96] [cursor=pointer]
  - generic [ref=e97]:
    - banner [ref=e98]:
      - generic [ref=e99]:
        - combobox [ref=e104] [cursor=pointer]:
          - option "Todos os Programas (0)" [selected]
        - textbox "Buscar episódio, convidado, pauta..." [ref=e109]
      - 'generic "Autenticação obrigatória: cabeçalho Authorization Bearer ausente." [ref=e111]': "Falha: Autenticação obrigatór"
    - main [ref=e115]:
      - generic [ref=e117]:
        - generic [ref=e123]:
          - generic [ref=e124]: Isolamento de Conteúdo RSPlay TV
          - heading "Acesso Restrito para este Programa ou Módulo" [level=3] [ref=e126]
          - paragraph [ref=e127]: Sessão não autenticada. Faça login para acessar os programas.
        - generic [ref=e128]:
          - generic [ref=e129]:
            - generic [ref=e130]: "Login Autenticado:"
            - generic [ref=e131]: Não autenticado
          - generic [ref=e132]:
            - generic [ref=e133]: "Permissão Exigida:"
            - generic [ref=e134]: Dashboard Operacional do Programa
        - button "Trocar Login de Programa" [ref=e136] [cursor=pointer]
```