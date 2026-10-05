import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  CreditCard,
  BarChart3,
  Plus,
  UserCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Tv,
  Search,
  KeyRound,
  Activity,
  Loader2,
} from 'lucide-react';
import {
  AdminReportSummary,
  AuditLogEntry,
  AuthSession,
  BillingInvoice,
  OrganizationRole,
  PaymentGatewayEvent,
  SaaSSubscription,
  Show,
  User,
  UserShowPermission,
} from '../types';
import { api } from '../services/api';

interface AdminPanelViewProps {
  session: AuthSession | null;
  onImpersonateUser: (email: string, loginCode?: string) => Promise<void>;
  onWorkspaceMutated: () => Promise<void>;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateTimeBR(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  session,
  onImpersonateUser,
  onWorkspaceMutated,
}) => {
  const [activeTab, setActiveTab] = useState<'users_rbac' | 'subscriptions' | 'reports'>(
    'users_rbac'
  );
  const [users, setUsers] = useState<User[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [subscriptions, setSubscriptions] = useState<SaaSSubscription[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [gatewayEvents, setGatewayEvents] = useState<PaymentGatewayEvent[]>([]);
  const [reportSummary, setReportSummary] = useState<AdminReportSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Create New Program User Form
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('Apresentador & Produtor do Programa');
  const [newLoginCode, setNewLoginCode] = useState('programa123');
  const [newRole, setNewRole] = useState<OrganizationRole>('producer');
  const [newAllowedShowIds, setNewAllowedShowIds] = useState<string[]>([]);

  // Audit Search
  const [auditFilter, setAuditFilter] = useState('');

  const loadAdminOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminOverview();
      setUsers(data.users);
      setShows(data.shows);
      setSubscriptions(data.subscriptions);
      setInvoices(data.invoices);
      setGatewayEvents(data.gatewayEvents);
      setReportSummary(data.reportSummary);
      setAuditLogs(data.auditLogs);
      if (data.shows.length > 0 && newAllowedShowIds.length === 0) {
        setNewAllowedShowIds([data.shows[0].id]);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao carregar Painel Administrativo RSPlay TV.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminOverview();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setSavingId('create-user');
    setFeedback(null);
    try {
      const showPermissions: Partial<UserShowPermission>[] = newAllowedShowIds.map((shId) => ({
        showId: shId,
        canView: true,
        canEditEditorial: true,
        canEditScript: true,
        canOperateStudio: true,
        canManageSchedule: true,
        canManageAssets: true,
        canExport: true,
      }));

      const created = await api.createAdminUser({
        name: newName.trim(),
        email: newEmail.trim(),
        jobTitle: newJobTitle.trim(),
        loginCode: newLoginCode.trim() || 'rsplay123',
        role: newRole,
        showPermissions,
      });

      setIsNewUserOpen(false);
      setNewName('');
      setNewEmail('');
      await loadAdminOverview();
      await onWorkspaceMutated();
      setFeedback({
        type: 'success',
        text: `Login individual "${created.email}" criado e vinculado a ${showPermissions.length} programa(s) com sucesso!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao criar login de programa.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleUserShowPermission = async (
    targetUser: User,
    showId: string,
    field:
      | 'canView'
      | 'canEditEditorial'
      | 'canEditScript'
      | 'canOperateStudio'
      | 'canManageSchedule'
      | 'canManageAssets'
      | 'canExport'
  ) => {
    setSavingId(`perm-${targetUser.id}-${showId}`);
    setFeedback(null);
    try {
      const currentPerms = targetUser.showPermissions || [];
      const existing = currentPerms.find((p) => p.showId === showId);

      let nextPerms: Partial<UserShowPermission>[];
      if (!existing) {
        nextPerms = [
          ...currentPerms,
          {
            showId,
            canView: true,
            canEditEditorial: true,
            canEditScript: true,
            canOperateStudio: true,
            canManageSchedule: true,
            canManageAssets: true,
            canExport: true,
          },
        ];
      } else {
        const toggledValue = !existing[field];
        if (field === 'canView' && !toggledValue) {
          // Removing view permission removes access to this show
          nextPerms = currentPerms.filter((p) => p.showId !== showId);
        } else {
          nextPerms = currentPerms.map((p) =>
            p.showId === showId ? { ...p, [field]: toggledValue, canView: true } : p
          );
        }
      }

      await api.updateUserShowPermissions(targetUser.id, nextPerms);
      await loadAdminOverview();
      await onWorkspaceMutated();
      setFeedback({
        type: 'success',
        text: `Permissões de programa atualizadas para ${targetUser.name}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao salvar permissões do usuário.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    const nextStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    setSavingId(`status-${targetUser.id}`);
    setFeedback(null);
    try {
      await api.updateUserStatusOrRole(targetUser.id, { status: nextStatus });
      await loadAdminOverview();
      setFeedback({
        type: 'success',
        text: `Status da conta ${targetUser.email} alterado para ${
          nextStatus === 'active' ? 'Ativo' : 'Suspenso'
        }.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao alterar status do usuário.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleTriggerRenewal = async (subId: string) => {
    setSavingId(`renew-${subId}`);
    setFeedback(null);
    try {
      const res = await api.renewSubscriptionNow(subId, false);
      await loadAdminOverview();
      await onWorkspaceMutated();
      setFeedback({
        type: 'success',
        text: `Ciclo de renovação automática processado (${res.invoice.invoiceNumber})!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao renovar assinatura.',
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        <span className="text-sm">Carregando Painel Administrativo RSPlay TV SaaS...</span>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter((l) => {
    const q = auditFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      l.action.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      JSON.stringify(l.metadata).toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="text-xs text-amber-400 font-medium mb-1">
            RSPlay TV SaaS · Governança Corporativa, RBAC por Programa & BI
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Painel Administrativo Master
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie logins individuais de cada programa, matriz de permissões de acesso, assinaturas mensais e relatórios executivos.
          </p>
        </div>

        {/* Interactive Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab('users_rbac')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'users_rbac'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuários & Permissões por Programa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Assinaturas & Gateway</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Relatórios Detalhados & Auditoria</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Strip */}
      {reportSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="text-xs text-zinc-400">MRR Mensal Recorrente</div>
            <div className="text-xl font-bold text-zinc-100 font-mono tabular-nums mt-1">
              {formatBRL(reportSummary.mrrCents)}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {reportSummary.activeSubscriptionsCount} assinatura(s) ativa(s)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="text-xs text-zinc-400">Receita Faturada Liquidada</div>
            <div className="text-xl font-bold text-zinc-100 font-mono tabular-nums mt-1">
              {formatBRL(reportSummary.paidInvoicesTotalCents)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 font-mono tabular-nums">
              Pendente: {formatBRL(reportSummary.pendingInvoicesTotalCents)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="text-xs text-zinc-400">Renovação Automática</div>
            <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
              {reportSummary.autoRenewEnabledCount}/{subscriptions.length || 1}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Planos integrados ao Gateway
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="text-xs text-zinc-400">Logins Individuais Ativos</div>
            <div className="text-xl font-bold text-zinc-100 font-mono tabular-nums mt-1">
              {reportSummary.usersCount}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Isolamento por perfil de programa
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="text-xs text-zinc-400">Programas na Grade</div>
            <div className="text-xl font-bold text-zinc-100 font-mono tabular-nums mt-1">
              {shows.length}
            </div>
            <div className="text-[11px] text-amber-400 mt-1">
              RBAC granular ativo
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* TAB 1: USERS & GRANULAR PROGRAM-LEVEL RBAC */}
      {activeTab === 'users_rbac' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Logins Individuais por Programa & Matriz de Permissões
              </h2>
              <p className="text-xs text-zinc-400">
                Configure quais programas cada login pode acessar e quais módulos (Editorial, Roteiro, Estúdio, Agenda, Assets) estão liberados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewUserOpen((prev) => !prev)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Login de Programa</span>
            </button>
          </div>

          {/* New User Drawer/Form */}
          {isNewUserOpen && (
            <form
              onSubmit={handleCreateUser}
              className="p-6 rounded-2xl bg-zinc-900/90 border border-amber-500/40 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Cadastrar Novo Login Individual de Programa</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewUserOpen(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Nome do Responsável / Equipe
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="ex: Lucas Andrade (Login Esporte)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    E-mail de Login Individual
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ex: lucas@rsplaytv.com.br"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Senha / Código de Acesso
                  </label>
                  <input
                    type="text"
                    required
                    value={newLoginCode}
                    onChange={(e) => setNewLoginCode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Perfil Base na Emissora
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as OrganizationRole)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="producer">Produtor de Programa (Isolado)</option>
                    <option value="host">Apresentador / Host (Isolado)</option>
                    <option value="editor">Editor de Roteiro & Corte (Isolado)</option>
                    <option value="viewer">Visualizador do Programa (Leitura)</option>
                    <option value="admin">Administrador Master (Acesso Total)</option>
                  </select>
                </div>
              </div>

              {newRole !== 'admin' && newRole !== 'owner' && (
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-400">
                    Selecione os Programas Liberados para este Login (Isolamento de Conteúdo):
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {shows.map((sh) => {
                      const checked = newAllowedShowIds.includes(sh.id);
                      return (
                        <label
                          key={sh.id}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 font-semibold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAllowedShowIds((prev) => [...prev, sh.id]);
                              } else {
                                setNewAllowedShowIds((prev) =>
                                  prev.filter((id) => id !== sh.id)
                                );
                              }
                            }}
                          />
                          <span>{sh.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingId === 'create-user'}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs cursor-pointer"
                >
                  {savingId === 'create-user'
                    ? 'Criando Login e Permissões...'
                    : 'Criar Login Individual'}
                </button>
              </div>
            </form>
          )}

          {/* User Cards & Granular Permission Matrix */}
          <div className="space-y-4">
            {users.map((u) => {
              const isCurrentSession = session?.user.id === u.id;
              const isAdmin = u.role === 'owner' || u.role === 'admin';

              return (
                <div
                  key={u.id}
                  className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-bold text-zinc-100">{u.name}</span>
                        <span className="text-xs font-mono text-zinc-400">· {u.email}</span>
                        <span className="text-xs font-mono text-amber-400">
                          · Código: {u.loginCode || 'rsplay123'}
                        </span>
                        {isCurrentSession && (
                          <span className="text-xs font-semibold text-emerald-400">
                            · Conectado Agora
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {u.jobTitle || 'Equipe RSPlay TV'} · Papel:{' '}
                        <span className="text-zinc-200 font-medium uppercase">{u.role}</span> ·
                        Status:{' '}
                        <span
                          className={
                            u.status === 'suspended' ? 'text-red-400' : 'text-emerald-400'
                          }
                        >
                          {u.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {!isCurrentSession && (
                        <button
                          type="button"
                          onClick={() => onImpersonateUser(u.email, u.loginCode)}
                          className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                          title="Alternar para este login para verificar que ele visualiza apenas seus programas liberados"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Testar Visão deste Login</span>
                        </button>
                      )}
                      {!isAdmin && (
                        <button
                          type="button"
                          disabled={savingId === `status-${u.id}`}
                          onClick={() => handleToggleUserStatus(u)}
                          className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {u.status === 'suspended' ? 'Reativar Login' : 'Suspender Acesso'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Program Access Matrix for this User */}
                  {isAdmin ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Perfil Administrador Geral ({u.role}):</strong> possui acesso irrestrito a todos os {shows.length} programas da grade, faturamento e painel administrativo.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Matriz de Permissões Específicas por Programa (Desmarque &ldquo;Liberar Programa&rdquo; para ocultar o programa deste login):
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 text-[11px] text-zinc-400">
                              <th className="py-2 pr-4 font-medium">Programa da Grade</th>
                              <th className="py-2 px-3 font-medium text-center">
                                Liberar Programa
                              </th>
                              <th className="py-2 px-3 font-medium text-center">
                                Pauta & Editorial
                              </th>
                              <th className="py-2 px-3 font-medium text-center">Roteiro</th>
                              <th className="py-2 px-3 font-medium text-center">
                                Estúdio Ao Vivo
                              </th>
                              <th className="py-2 px-3 font-medium text-center">Agenda</th>
                              <th className="py-2 px-3 font-medium text-center">Assets</th>
                              <th className="py-2 pl-3 font-medium text-center">Exportar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 text-xs">
                            {shows.map((sh) => {
                              const perm = u.showPermissions?.find(
                                (p) => p.showId === sh.id && p.canView
                              );
                              const isUnlocked = Boolean(perm?.canView);

                              return (
                                <tr key={sh.id} className="hover:bg-zinc-900/40">
                                  <td className="py-2.5 pr-4 font-medium text-zinc-200">
                                    <div className="flex items-center gap-2">
                                      <Tv
                                        className={`w-3.5 h-3.5 ${
                                          isUnlocked ? 'text-amber-400' : 'text-zinc-600'
                                        }`}
                                      />
                                      <span>{sh.title}</span>
                                    </div>
                                  </td>
                                  {(
                                    [
                                      'canView',
                                      'canEditEditorial',
                                      'canEditScript',
                                      'canOperateStudio',
                                      'canManageSchedule',
                                      'canManageAssets',
                                      'canExport',
                                    ] as const
                                  ).map((field) => {
                                    const checked =
                                      field === 'canView'
                                        ? isUnlocked
                                        : isUnlocked && Boolean(perm?.[field]);
                                    return (
                                      <td key={field} className="py-2.5 px-3 text-center">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={
                                            savingId === `perm-${u.id}-${sh.id}` ||
                                            (field !== 'canView' && !isUnlocked)
                                          }
                                          onChange={() =>
                                            handleToggleUserShowPermission(u, sh.id, field)
                                          }
                                          className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 cursor-pointer disabled:opacity-30"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTIONS & GATEWAY MANAGEMENT */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Controle Administrativo de Assinaturas & Renovação Automática
            </h2>
            <p className="text-xs text-zinc-400">
              Acompanhe todas as assinaturas mensais ativas, status de cobrança recorrente no gateway e faturas geradas.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
                  <th className="py-3 px-4 font-medium">Plano Mensal / Escopo</th>
                  <th className="py-3 px-4 font-medium">Gateway & Método</th>
                  <th className="py-3 px-4 font-medium">Vigência do Ciclo</th>
                  <th className="py-3 px-4 font-medium">Renovação Automática</th>
                  <th className="py-3 px-4 font-medium text-right">Valor Mensal</th>
                  <th className="py-3 px-4 font-medium text-right">Ações Gateway</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-xs">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-100">{sub.planName}</div>
                      <div className="text-[11px] text-zinc-400">
                        {sub.showTitle
                          ? `Programa: ${sub.showTitle}`
                          : 'Escopo: Rede / Multiprograma'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-zinc-200">{sub.paymentMethodBrand}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {sub.gatewaySubscriptionId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-zinc-300">
                      Até {sub.currentPeriodEnd.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          sub.autoRenew
                            ? 'text-emerald-400 font-semibold'
                            : 'text-zinc-500 font-medium'
                        }
                      >
                        {sub.autoRenew ? 'Ativa (Recorrente)' : 'Pausada'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-zinc-100">
                      {formatBRL(sub.amountCents)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={savingId === `renew-${sub.id}`}
                        onClick={() => handleTriggerRenewal(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            savingId === `renew-${sub.id}` ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Renovar Agora</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Últimas Faturas Emitidas ({invoices.length})
              </h3>
              <div className="divide-y divide-zinc-800/80">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-amber-300 font-semibold">
                        {inv.invoiceNumber}
                      </span>{' '}
                      <span className="text-zinc-300">· {inv.description}</span>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-zinc-100">
                      {formatBRL(inv.amountCents)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Eventos Recentes do Gateway ({gatewayEvents.length})
              </h3>
              <div className="divide-y divide-zinc-800/80">
                {gatewayEvents.map((ev) => (
                  <div key={ev.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-200">{ev.eventType}</span>
                    <span className="font-mono text-emerald-400">{ev.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETAILED REPORTS & SECURITY AUDIT */}
      {activeTab === 'reports' && reportSummary && (
        <div className="space-y-6">
          {/* Detailed Program Report Table */}
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  Relatório Detalhado de Produção, Audiência & Acesso por Programa
                </h2>
                <p className="text-xs text-zinc-400">
                  Consolidação de episódios, minutagem planejada de grade, sessões de estúdio e logins autorizados por atração.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                Dados em Tempo Real (SQL)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                    <th className="py-3 pr-4 font-medium">Programa da Grade</th>
                    <th className="py-3 px-4 font-medium">Formato / Host</th>
                    <th className="py-3 px-4 font-medium text-right">Episódios Totais</th>
                    <th className="py-3 px-4 font-medium text-right">Prontos / Gravados</th>
                    <th className="py-3 px-4 font-medium text-right">Minutagem Total</th>
                    <th className="py-3 px-4 font-medium text-right">Sessões de Estúdio</th>
                    <th className="py-3 pl-4 font-medium text-right">Logins Autorizados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-xs">
                  {reportSummary.showsReport.map((row) => (
                    <tr key={row.showId} className="hover:bg-zinc-900/40">
                      <td className="py-3.5 pr-4 font-semibold text-zinc-100">
                        {row.showTitle}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {row.format} · {row.host}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-zinc-200">
                        {row.episodesCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                        {row.publishedOrReadyCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-zinc-200">
                        {row.totalPlannedMinutes} min
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-300">
                        {row.scheduledSessionsCount}
                      </td>
                      <td className="py-3.5 pl-4 text-right font-mono tabular-nums font-bold text-zinc-100">
                        {row.authorizedUsersCount} perfil(is)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Audit Log */}
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  Trilha de Auditoria de Segurança, Logins & Operações ({filteredLogs.length})
                </h3>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  placeholder="Filtrar ação, entidade ou usuário..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500"
                />
              </div>
            </div>

            <div className="divide-y divide-zinc-800/70 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-amber-400 font-semibold">
                      {log.entityType}
                    </span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-200 font-medium">{log.action}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="font-mono text-zinc-400 truncate max-w-md">
                      {JSON.stringify(log.metadata)}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500 tabular-nums shrink-0">
                    {formatDateTimeBR(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
