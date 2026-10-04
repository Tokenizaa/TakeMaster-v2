import React, { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  Clock,
  User,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Episode, ScriptVersion } from '../../types';
import { api } from '../../services/api';

interface VersionHistoryTabProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  onAdvanceToNextTab: () => void;
}

export const VersionHistoryTab: React.FC<VersionHistoryTabProps> = ({
  episode,
  onUpdateEpisode,
  onAdvanceToNextTab,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ScriptVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  const refreshEpisode = async () => {
    setLoading(true);
    try {
      const res = await api.getEpisode(episode.id);
      if (res) {
        return res;
      }
      return episode;
    } catch (err) {
      console.error('Failed to refresh episode:', err);
      return episode;
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (version: ScriptVersion) => {
    setRestoring(true);
    try {
      const episodeToRestore = {
        ...episode,
        title: version.snapshot.title || episode.title,
        idea: version.snapshot.idea || episode.idea,
        topic: version.snapshot.topic || episode.topic,
        synopsis: version.snapshot.synopsis || episode.synopsis,
      };

      await onUpdateEpisode(episodeToRestore);
      alert(`Versão ${version.versionNumber} restaurada com sucesso!`);
    } catch (err) {
      console.error('Failed to restore version:', err);
      alert('Erro ao restaurar versão');
    } finally {
      setRestoring(false);
    }
  };

  const handleViewVersion = (version: ScriptVersion) => {
    setSelectedVersion(version);
  };

  const handleCloseVersionView = () => {
    setSelectedVersion(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-zinc-100">Histórico de Versões</h2>
        </div>
        <button
          onClick={refreshEpisode}
          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded transition-colors"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Atualizar
        </button>
      </div>

      {episode.versions && episode.versions.length > 0 ? (
        <div className="space-y-3">
          {episode.versions.map((version) => (
            <div
              key={version.id}
              className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between group ${
                selectedVersion?.id === version.id ? 'border-amber-400' : ''
              }`}
              onClick={() => handleViewVersion(version)}
            >
              <div className="flex items-center justify-between space-x-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <GitCommit className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">
                      Versão {version.versionNumber}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {version.name || `Versão ${version.versionNumber}`}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-zinc-400">
                  {formatDate(version.savedAt)}
                </div>
              </div>

              <div className="text-xs text-zinc-400">
                {version.description || 'Sem descrição das alterações'}
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  {version.changed_by ? (
                    <>
                      <User className="w-3 h-3 text-zinc-400" />
                      <span>Alterado por</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-zinc-400 opacity-50" />
                      <span>Sistema</span>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestoreVersion(version);
                  }}
                  disabled={restoring}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    restoring ? 'opacity-50 cursor-not-allowed' : 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                  }`}
                >
                  {restoring ? 'Restaurando...' : 'Restaurar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <GitBranch className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-400">Nenhum histórico de versões encontrado</h3>
          <p className="text-xs text-zinc-500">
            As versões serão exibidas aqui à medida que o episódio for editado e salvo.
          </p>
        </div>
      )}

      {selectedVersion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-100">
                Visualizando Versão {selectedVersion.versionNumber}
              </h3>
              <button onClick={handleCloseVersionView} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-mono uppercase">Nome:</p>
                <p className="text-zinc-300">{selectedVersion.name || 'Sem nome'}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-mono uppercase">Descrição:</p>
                <p className="text-zinc-300">
                  {selectedVersion.description || 'Sem descrição'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-mono uppercase">Salvo em:</p>
                <p className="text-zinc-300">
                  {formatDate(selectedVersion.savedAt)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-mono uppercase">Alterado por:</p>
                <p className="text-zinc-300">
                  {selectedVersion.changed_by || 'Sistema'}
                </p>
              </div>

              {Object.keys(selectedVersion.snapshot || {}).length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-800/50">
                  <p className="text-xs text-zinc-400 font-mono uppercase mb-2">Dados do Episódio:</p>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 font-mono">Título:</p>
                    <p className="text-zinc-300">
                      {selectedVersion.snapshot.title || 'Não disponível'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 font-mono">Ideia:</p>
                    <p className="text-zinc-300">
                      {selectedVersion.snapshot.idea || 'Não disponível'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 font-mono">Tópico:</p>
                    <p className="text-zinc-300">
                      {selectedVersion.snapshot.topic || 'Não disponível'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 font-mono">Sinopse:</p>
                    <p className="text-zinc-300">
                      {selectedVersion.snapshot.synopsis || 'Não disponível'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
