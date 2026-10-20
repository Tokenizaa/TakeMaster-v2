import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MailPlus, RefreshCw, ShieldCheck, UserMinus, Users } from 'lucide-react';
import { AuthSession, Show } from '../types';
import { api, ProgramTeamResponse } from '../services/api';

type TeamRole = 'producer' | 'editor' | 'host' | 'viewer';

interface ProgramTeamViewProps {
  session: AuthSession | null;
  shows: Show[];
  selectedShowId: string;
  onWorkspaceMutated: () => Promise<void>;
}

const ROLE_LABELS: Record<TeamRole | 'executive', string> = {
  executive: 'Diretor executivo',
  producer: 'Produtor',
  editor: 'Editor',
  host: 'Apresentador',
  viewer: 'Somente leitura',
};

export const ProgramTeamView: React.FC<ProgramTeamViewProps> = ({
  session, shows, selectedShowId, onWorkspaceMutated,
}) => {
  const isGlobalAdmin = session?.role === 'owner' || session?.role === 'admin';
  const manageableShows = useMemo(
    () => isGlobalAdmin ? shows : shows.filter((show) => show.executiveUserId === session?.user.id),
    [isGlobalAdmin, shows, session?.user.id],
  );
  const [programId, setProgramId] = useState('');
  const [team, setTeam] = useState<ProgramTeamResponse | null>(null);
  const [subscriptionInactive, setSubscriptionInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<TeamRole>('editor');

  useEffect(() => {
    if (selectedShowId !== 'ALL' && manageableShows.some((show) => show.id === selectedShowId)) {
      setProgramId(selectedShowId);
    } else if (!programId || !manageableShows.some((show) => show.id === programId)) {
      setProgramId(manageableShows[0]?.id || '');
    }
  }, [selectedShowId, manageableShows, programId]);

  const loadTeam = useCallback(async () => {
    if (!programId) { setTeam(null); setSubscriptionInactive(false); return; }
    setLoading(true);
    try {
      setSubscriptionInactive(false);
      setTeam(await api.getProgramTeam(programId));
    } catch (error: any) {
      setSubscriptionInactive(error?.statusCode === 402 || error?.code === 'SUBSCRIPTION_INACTIVE');
      setTeam(null);
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível carregar a equipe deste programa.' });
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { void loadTeam(); }, [loadTeam]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!programId || !name.trim() || !email.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await api.inviteProgramTeamMember(programId, {
        name: name.trim(), email: email.trim(), jobTitle: jobTitle.trim(), role,
      });
      setName('');
      setEmail('');
      setJobTitle('');
      setRole('editor');
      await loadTeam();
      await onWorkspaceMutated();
      setFeedback({
        type: 'success',
        text: result.invited
          ? 'Convite enviado. O acesso está limitado a este programa.'
          : 'Profissional autorizado neste programa usando a conta existente.',
      });
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível autorizar este profissional.' });
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (userId: string, nextRole: TeamRole) => {
    if (!programId) return;
    setSaving(true);
    setFeedback(null);
    try {
      await api.updateProgramTeamMember(programId, userId, { role: nextRole });
      await loadTeam();
      await onWorkspaceMutated();
      setFeedback({ type: 'success', text: 'Função atualizada somente neste programa.' });
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível atualizar a função.' });
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (userId: string, memberName: string) => {
    if (!programId || !window.confirm(`Remover ${memberName} deste programa? O acesso a outros programas não será alterado.`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      await api.revokeProgramTeamMember(programId, userId);
      await loadTeam();
      await onWorkspaceMutated();
      setFeedback({ type: 'success', text: 'Acesso revogado somente neste programa.' });
    } catch (error: any) {
      setFeedback({ type: 'error', text: error?.message || 'Não foi possível revogar o acesso.' });
    } finally {
      setSaving(false);
    }
  };

  if (manageableShows.length === 0) {
    return <div className="m-6 rounded-xl border border-zinc-800 p-6 text-sm text-zinc-400">Você não é o diretor executivo responsável por nenhum programa disponível nesta conta.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-center">
        <div>
          <p className="mb-1 text-xs font-medium text-emerald-400">RS Play TV · Acessos</p>
          <h1 className="text-2xl font-bold text-zinc-100">Equipe do programa</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">Autorize profissionais existentes ou convide novos integrantes. Cada autorização vale somente para o programa selecionado.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />Permissões por programa
        </div>
      </header>

      {feedback && <div className={`rounded-xl border p-4 text-sm ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>{feedback.text}</div>}

      <label className="block max-w-xl space-y-2 text-sm text-zinc-300">
        <span>Programa sob sua responsabilidade</span>
        <select value={programId} onChange={(event) => setProgramId(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-zinc-100">
          {manageableShows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}
        </select>
      </label>

      {subscriptionInactive ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          Conclua o pagamento deste programa na área Contratação & PIX. A gestão da equipe será liberada depois da confirmação do VenoPag.
        </div>
      ) : (
      <>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100"><Users className="h-5 w-5 text-zinc-400" />Equipe autorizada ({team?.members.length || 0})</h2>
          <button type="button" onClick={() => void loadTeam()} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button>
        </div>
        {loading ? <div className="flex items-center gap-2 p-6 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Carregando equipe...</div> : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {(team?.members || []).length === 0 ? <p className="p-5 text-sm text-zinc-400">Nenhum profissional adicional autorizado.</p> : team?.members.map((member) => (
              <div key={member.userId} className="flex flex-col gap-3 border-b border-zinc-800 p-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-100">{member.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">{member.email}{member.jobTitle ? ` · ${member.jobTitle}` : ''}</div>
                </div>
                {member.role === 'executive' ? <span className="w-fit rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">Diretor executivo responsável</span> : (
                  <div className="flex items-center gap-2">
                    <select value={member.role as TeamRole} disabled={saving} onChange={(event) => void changeRole(member.userId, event.target.value as TeamRole)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100">
                      {(['producer','editor','host','viewer'] as TeamRole[]).map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
                    </select>
                    <button type="button" disabled={saving} onClick={() => void revoke(member.userId, member.name)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"><UserMinus className="h-3.5 w-3.5" />Remover</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100"><MailPlus className="h-5 w-5 text-zinc-400" />Adicionar profissional</h2>
        <p className="mt-2 text-sm text-zinc-400">Se o e-mail já pertence a um usuário da plataforma, a conta existente será reutilizada. Caso contrário, será enviado um convite. Nenhum novo login é necessário para quem já tem conta.</p>
        <form onSubmit={invite} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-300"><span>Nome</span><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" /></label>
          <label className="space-y-2 text-sm text-zinc-300"><span>E-mail</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" /></label>
          <label className="space-y-2 text-sm text-zinc-300"><span>Função</span><select value={role} onChange={(event) => setRole(event.target.value as TeamRole)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100">{(['producer','editor','host','viewer'] as TeamRole[]).map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}</select></label>
          <label className="space-y-2 text-sm text-zinc-300"><span>Cargo (opcional)</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" /></label>
          <div className="flex justify-end md:col-span-2"><button type="submit" disabled={saving || !programId} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}Autorizar acesso</button></div>
        </form>
      </section>
      </>
      )}
    </div>
  );
};
