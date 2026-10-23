# 📝 Audit Log Imutável (WORM)

**Projeto:** TakeMaster-v2 / RSPlay TV SaaS  
**Responsável:** Application Security Engineer / Incident Responder  
**Versão:** 1.0  
**Data:** 22 Out 2026

---

## 1. OBJETIVO

Garantir que os logs de auditoria sejam imutáveis (Write Once Read Many - WORM), prevenindo que um atacante com acesso ao banco apague ou altere evidências de suas ações.

---

## 2. PROBLEMA

Atualmente, o `audit_log` no Supabase pode ser modificado/excluído por alguém com acesso direto (service role). Um atacante pode apagar evidências de suas atividades.

---

## 3. SOLUÇÃO: HASH-CHAIN

Cada entrada de audit_log inclui um hash da entrada anterior, criando cadeia imutável. Qualquer alteração invalida todos os hashes subsequentes.

### 3.1 Estrutura da Entrada

| Campo | Descrição |
|-------|-----------|
| `id` | UUID da entrada |
| `previous_hash` | Hash da entrada anterior |
| `entry_hash` | Hash SHA-256 desta entrada |
| `organization_id` | Organização |
| `actor_user_id` | Usuário que executou a ação |
| `action` | Tipo de ação |
| `table_name` | Tabela afetada |
| `row_id` | ID da linha afetada |
| `metadata` | Dados adicionais (JSON) |
| `created_at` | Timestamp |

### 3.2 Cálculo do Hash

```
entry_hash = SHA-256(previous_hash || organization_id || actor_user_id || action || table_name || row_id || metadata || created_at)
```

### 3.3 Validação da Cadeia

1. Ordenar entradas por `created_at`
2. Recalcular `entry_hash` de cada entrada e comparar com o armazenado
3. Verificar que `previous_hash` de cada entrada = `entry_hash` da anterior
4. Qualquer divergência indica tampering

---

## 4. IMPLEMENTAÇÃO

### 4.1 Função SQL no Banco

```sql
CREATE OR REPLACE FUNCTION public.generate_entry_hash(
  p_previous_hash text,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_table_name text,
  p_row_id uuid,
  p_metadata jsonb,
  p_created_at timestamptz
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_concat text;
BEGIN
  v_concat := coalesce(p_previous_hash, '') || '|' ||
              coalesce(p_organization_id::text, '') || '|' ||
              coalesce(p_actor_user_id::text, '') || '|' ||
              coalesce(p_action, '') || '|' ||
              coalesce(p_table_name, '') || '|' ||
              coalesce(p_row_id::text, '') || '|' ||
              coalesce(p_metadata::text, '') || '|' ||
              coalesce(p_created_at::text, '');
  RETURN encode(digest(v_concat, 'sha256'), 'hex');
END;
$$;

-- Trigger para preencher previous_hash e entry_hash automaticamente
CREATE OR REPLACE FUNCTION public.audit_log_immutable_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prev_hash text;
  v_entry_hash text;
BEGIN
  -- Buscar hash da entrada anterior
  SELECT entry_hash INTO v_prev_hash
  FROM public.audit_log
  WHERE organization_id = NEW.organization_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  NEW.previous_hash := v_prev_hash;
  NEW.entry_hash := public.generate_entry_hash(
    v_prev_hash,
    NEW.organization_id,
    NEW.actor_user_id,
    NEW.action,
    NEW.table_name,
    NEW.row_id,
    NEW.metadata,
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_log_immutable
BEFORE INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable_trigger();
```

### 4.2 Endpoint de Validação

```
GET /api/v1/audit/validate-integrity
```

Retorna se a cadeia de hash está íntegra ou quais entradas foram adulteradas.

### 4.3 CHECKLIST

- [ ] Adicionar colunas `previous_hash` e `entry_hash` à tabela `audit_log`
- [ ] Criar trigger SQL para preenchimento automático
- [ ] Implementar endpoint de validação de integridade
- [ ] Executar validação mensalmente (tabletop exercise)
- [ ] Arquivar logs antigos em storage imutável (S3 Object Lock)

---

## 5. REFERÊNCIA

- WORM Storage: https://aws.amazon.com/s3/features/object-lock/
- Hash Chain: https://www.nist.gov/publications/hash-chain-integrity
