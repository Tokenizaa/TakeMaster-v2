import React from 'react';
import { Lock, ShieldAlert, KeyRound, Tv, ArrowLeft } from 'lucide-react';
import { AuthSession, OrganizationRole } from '../types';
import {
  ShowPermissionCapability,
  usePermissions,
} from '../hooks/usePermissions';

interface ShowPermissionGuardProps {
  session: AuthSession | null | undefined;
  showId?: string | null;
  showTitle?: string;
  requiredCapability?: ShowPermissionCapability;
  allowedRoles?: OrganizationRole[];
  featureLabel?: string;
  onSwitchLogin?: () => void;
  onResetShowFilter?: () => void;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const CAPABILITY_LABELS: Record<ShowPermissionCapability, string> = {
  canView: 'Visualizar Programa & Conteúdos',
  canEditEditorial: 'Edição Editorial (Diagnóstico, Pesquisa e Pauta)',
  canEditScript: 'Edição de Roteiro, Perguntas e Cortes',
  canOperateStudio: 'Operação de Estúdio, Câmeras e Teleprompter',
  canManageSchedule: 'Gestão de Agenda de Produção',
  canManageAssets: 'Gestão de Biblioteca e B-Roll',
  canExport: 'Exportação de Roteiros e Dossiês',
};

export const ShowPermissionGuard: React.FC<ShowPermissionGuardProps> = ({
  session,
  showId,
  showTitle,
  requiredCapability = 'canView',
  allowedRoles,
  featureLabel,
  onSwitchLogin,
  onResetShowFilter,
  fallback,
  children,
}) => {
  const { getShowPermissions, hasOrganizationRole } = usePermissions(session, showId);
  const perms = getShowPermissions(showId);

  const roleAllowed =
    !allowedRoles || allowedRoles.length === 0 || hasOrganizationRole(allowedRoles);
  const capabilityAllowed = perms.hasShowAccess && perms[requiredCapability];

  if (roleAllowed && capabilityAllowed) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-6 md:p-10 flex items-center justify-center min-h-[360px]">
      <div className="max-w-lg w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Isolamento de Conteúdo RSPlay TV
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-100 mt-1.5">
              Acesso Restrito para este Programa ou Módulo
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {perms.deniedReason ||
                `O perfil autenticado (${session?.user?.name || 'Visitante'}) não possui a permissão "${
                  CAPABILITY_LABELS[requiredCapability]
                }" habilitada para ${
                  showTitle ? `o programa "${showTitle}"` : 'este contexto'
                }.`}
            </p>
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Login Autenticado:</span>
            <span className="font-mono text-zinc-200">
              {session?.user?.email || 'Não autenticado'}
            </span>
          </div>
          {showId && showId !== 'ALL' && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>Programa Solicitado:</span>
              <span className="font-semibold text-amber-300 flex items-center gap-1">
                <Tv className="w-3.5 h-3.5" />
                {showTitle || showId}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-zinc-400">
            <span>Permissão Exigida:</span>
            <span className="font-mono text-zinc-200">
              {featureLabel || CAPABILITY_LABELS[requiredCapability]}
            </span>
          </div>
          {allowedRoles && allowedRoles.length > 0 && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>Papéis Autorizados:</span>
              <span className="font-mono text-zinc-300">{allowedRoles.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
          {onResetShowFilter && showId && showId !== 'ALL' && (
            <button
              type="button"
              onClick={onResetShowFilter}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar aos Programas Liberados</span>
            </button>
          )}
          {onSwitchLogin && (
            <button
              type="button"
              onClick={onSwitchLogin}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Trocar Login de Programa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
