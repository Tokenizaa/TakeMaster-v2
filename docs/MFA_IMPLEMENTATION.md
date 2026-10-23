# 🔐 Implementação de MFA — Multi-Factor Authentication

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Identity Access Engineer / Application Security Engineer  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Implementar autenticação multifator (MFA) para usuários administrativos (owner, admin) e ações sensíveis (billing, exclusão de dados, alteração de permissões).

---

## 2. ESCOPO

### 2.1 Usuários obrigatórios a ter MFA

| Perfil | Obrigatoriedade |
|--------|-----------------|
| owner | Obrigatório |
| admin | Obrigatório |
| producer | Recomendado |
| editor | Opcional |
| host | Opcional |
| viewer | Opcional |

### 2.2 Ações que exigem MFA

| Ação | Endpoint | MFA Obrigatório |
|------|----------|-----------------|
| Alterar plano/billing | POST /api/v1/billing/subscribe | Sim |
| Excluir programa | DELETE /api/v1/shows/:id | Sim |
| Excluir episódio | DELETE /api/v1/episodes/:id | Sim |
| Alterar permissões de usuário | PUT /api/v1/admin/users/:id/permissions | Sim |
| Alterar status/role de usuário | PUT /api/v1/admin/users/:id/status | Sim |
| Acesso a painel admin | GET /api/v1/admin/overview | Sim |

---

## 3. IMPLEMENTAÇÃO

### 3.1 Middleware requireMFA (já implementado)

O middleware `requireMFA` existe em `src/server/auth.ts`. Verifica `ctx.mfaVerified === true`.

### 3.2 Fluxo de MFA

1. Usuário faz login → sessão criada com `mfaVerified: false`
2. Usuário tenta ação sensível → `requireMFA` retorna 403 `MFA_REQUIRED`
3. Usuário é redirecionado para verificação MFA (TOTP)
4. Usuário insere código → sessão atualizada com `mfaVerified: true` (janela de 15 min)
5. Usuário executa a ação sensível

### 3.3 TOTP

- Algoritmo: TOTP (RFC 6238)
- Janela: 30 segundos
- Issuer: "RSPlay TV"
- Armazenamento: segredo TOTP por usuário no Supabase (criptografado)

### 3.4 CHECKLIST

- [ ] Middleware `requireMFA` implementado (concluído Fase 2)
- [ ] Endpoint `/api/v1/auth/mfa/setup` — gerar segredo TOTP + QR code
- [ ] Endpoint `/api/v1/auth/mfa/verify` — validar código TOTP e marcar sessão
- [ ] Endpoint `/api/v1/auth/mfa/disable` — desativar MFA (requer senha + MFA atual)
- [ ] Aplicar `requireMFA` em endpoints sensíveis
- [ ] Obrigar MFA para owner/admin no primeiro login

---

## 4. REFERÊNCIA

- TOTP RFC 6238: https://tools.ietf.org/html/rfc6238
- WebAuthn/Passkeys: https://www.w3.org/TR/webauthn-2/
