# 🔑 SSO OIDC — Single Sign-On (OpenID Connect)

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Identity Access Engineer  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Implementar SSO corporativo via OpenID Connect (OIDC) para login com provedores de identidade empresariais (Google Workspace, Microsoft Entra ID / Azure AD, Okta).

---

## 2. PROVEDORES SUPORTADOS

| Provedor | Discovery URL | Uso |
|----------|--------------|-----|
| Google Workspace | https://accounts.google.com/.well-known/openid-configuration | E-mail corporativo Google |
| Microsoft Entra ID | https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration | E-mail corporativo Microsoft |
| Okta | https://{domain}.okta.com/.well-known/openid-configuration | IdP corporativo genérico |

---

## 3. FLUXO OIDC

```
Usuário → Clica "Entrar com Google/Microsoft"
  → Redireciona para Provedor OIDC (Authorization Request)
  → Usuário autentica no Provedor
  → Provedor redireciona com authorization code
  → API troca code por tokens (Token Endpoint)
  → API valida ID Token (assinatura JWT, emissor, audiência)
  → API extrai claims (email, sub, nome, grupos)
  → API cria/vincula usuário local no TakeMaster
  → Sessão tmv2 criada (cookie HttpOnly)
```

---

## 4. IMPLEMENTAÇÃO

### 4.1 Variáveis de Ambiente

```env
OIDC_PROVIDER=google  # ou microsoft, okta
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=https://api.rsplaytv.com.br/api/v1/auth/oidc/callback
OIDC_SCOPES=openid,email,profile,groups
```

### 4.2 Endpoints OIDC

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| /api/v1/auth/oidc/login | GET | Iniciar fluxo OIDC (redirect para IdP) |
| /api/v1/auth/oidc/callback | GET | Callback do IdP com authorization code |
| /api/v1/auth/oidc/link | POST | Vincular conta OIDC a usuário existente |
| /api/v1/auth/oidc/unlink | POST | Desvincular conta OIDC |

### 4.3 CHECKLIST

- [ ] Biblioteca OIDC client (ex: openid-client) instalada
- [ ] Endpoint `/api/v1/auth/oidc/login` implementado
- [ ] Endpoint `/api/v1/auth/oidc/callback` implementado
- [ ] Validação de assinatura JWT do ID Token
- [ ] Mapeamento de claims OIDC para usuário local
- [ ] Vinculação de conta OIDC a organização existente
- [ ] MFA opcional para usuários SSO (recomendado)

---

## 5. REFERÊNCIA

- OpenID Connect: https://openid.net/specs/openid-connect-core-1_0.html
- OWASP SSO: https://owasp.org/www-community/attacks/Session_Fixation
