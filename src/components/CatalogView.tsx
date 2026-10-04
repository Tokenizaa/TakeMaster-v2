import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Film,
  Users,
  Clapperboard,
  Image,
  Scissors,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Program, Episode, Guest, ProductionAsset } from '../types/domain';
import { api } from '../services/api';
import { ErrorMessage } from './ErrorMessage';

type TabType = 'programs' | 'episodes' | 'participants' | 'assets';

interface CatalogStats {
  totalPrograms: number;
  totalEpisodes: number;
  totalParticipants: number;
  totalAssets: number;
  totalShorts: number;
  totalSegments: number;
  episodesByStatus: Record<string, number>;
  programsWithEpisodes: number;
  recentEpisodes: Array<{ id: string; title: string; status: string; created_at: string; program_id: string }>;
  recentParticipants: Array<{ id: string; name: string; type: string; company: string; created_at: string }>;
}

interface PaginatedResult<T> {
  data: any[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface SearchResult {
  programs: Array<{ id: string; title: string; description: string | null; host: string; format: string; created_at: string }>;
  episodes: Array<{ id: string; title: string; idea: string; status: string; program_id: string; created_at: string }>;
  participants: Array<{ id: string; name: string; type: string; company: string; role: string; company_or_group: string | null }>;
  totalCount: number;
}

interface PaginatedResult<T> {
  data: any[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type TabType = 'programs' | 'episodes' | 'participants' | 'assets';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-800 text-zinc-400',
  diagnosis: 'bg-blue-900/30 text-blue-300',
  research: 'bg-purple-900/30 text-purple-300',
  outline: 'bg-amber-900/30 text-amber-300',
  scripting: 'bg-emerald-900/30 text-emerald-300',
  recording: 'bg-red-900/30 text-red-300',
  recorded: 'bg-sky-900/30 text-sky-300',
  editing: 'bg-violet-900/30 text-violet-300',
  ready: 'bg-amber-900/30 text-amber-300',
  published: 'bg-green-900/30 text-green-300',
  planned: 'bg-gray-800 text-zinc-400',
  draft: 'bg-gray-800 text-zinc-400',
};

const TAB_CONFIG: Record<string, { label: string; icon: React.ReactNode; endpoint: string; columns: string[] }> = {
  programs: { label: 'Programas', icon: <Film className="w-4 h-4" />, endpoint: '/api/catalog/programs', columns: ['Título', 'Formato', 'Apresentador', 'Status', 'Criado em'] },
  episodes: { label: 'Episódios', icon: <Clapperboard className="w-4 h-4" />, endpoint: '/api/catalog/episodes', columns: ['Título', 'Programa', 'Status', 'Convidado', 'Criado em'] },
  participants: { label: 'Participantes', icon: <Users className="w-4 h-4" />, endpoint: '/api/catalog/participants', columns: ['Nome', 'Tipo', 'Cargo', 'Empresa', 'Criado em'] },
  assets: { label: 'Assets', icon: <Image className="w-4 h-4" />, endpoint: '/api/catalog/assets', columns: ['Nome', 'Tipo', 'Episódio', 'Status', 'Criado em'] },
};

export const CatalogView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'programs' | 'episodes' | 'participants' | 'assets'>('programs');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryDebounced, setSearchQueryDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalPages: 1, count: 0 });
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/catalog/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = TAB_CONFIG[activeTab].endpoint;
      const res = await api.get(endpoint, {
        params: {
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      });
      if (res.data?.success) {
        setData(res.data.data);
        setPagination({
          page: res.data.page,
          pageSize: res.data.pageSize,
          totalPages: res.data.totalPages,
          count: res.data.count,
        });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData, activeTab, page, pageSize]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query || query.length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    try {
      const res = await api.get('/catalog/search', { params: { q: query, limit: 10 } });
      if (res.data?.success) {
        setSearchResults(res.data);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, []);

useEffect(() => {
  const debounce = setTimeout(() => handleSearch(searchQuery), 300);
  return () => clearTimeout(debounce);
}, [searchQuery]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleTabChange = (tab: 'programs' | 'episodes' | 'participants' | 'assets') => {
    setActiveTab(tab);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusStyle = (status: string): string => {
    return STATUS_STYLES[status] || 'bg-gray-800 text-zinc-400';
  };

  const getStatusBadge = (status: string) => {
    const statusStyle = STATUS_STYLES[status] || 'bg-gray-800 text-zinc-400';
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyle}`}>
        {status}
      </span>
    );
  };

  const renderProgramRow = (program: any) => (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-zinc-100 truncate max-w-[200px]">
        {program.title || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {program.format || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {program.host || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {program.status ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[program.status] || 'bg-gray-800 text-zinc-400'}`}>
            {program.status}
          </span>
        ) : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {program.created_at ? new Date(program.created_at).toLocaleDateString('pt-BR') : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
        <button
          onClick={() => console.log('edit', program.id)}
          className="px-2 py-1 bg-amber-600/20 text-amber-300 text-xs rounded hover:bg-amber-600/30 transition-colors"
          aria-label="Editar programa"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          </svg>
        </button>
      </td>
    </tr>
  );

  const renderEpisodeRow = (episode: any) => (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-100">
        {episode.title || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {episode.program_id || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {episode.status ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[episode.status] || 'bg-gray-800 text-zinc-400'}`}>
            {episode.status}
          </span>
        ) : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {episode.guest_name || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {episode.created_at ? new Date(episode.created_at).toLocaleDateString('pt-BR') : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
        <button
          onClick={() => console.log('edit', episode.id)}
          className="px-2 py-1 bg-amber-600/20 text-amber-300 text-xs rounded hover:bg-amber-600/30 transition-colors"
          aria-label="Editar episódio"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          </svg>
        </button>
      </td>
    </tr>
  );

  const renderParticipantRow = (participant: any) => (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-100">
        {participant.name || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {participant.type?.charAt(0).toUpperCase() + participant.type?.slice(1) || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {participant.role || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {participant.company || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {participant.created_at ? new Date(participant.created_at).toLocaleDateString('pt-BR') : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
        <button
          onClick={() => console.log('edit', participant.id)}
          className="px-2 py-1 bg-amber-600/20 text-amber-300 text-xs rounded hover:bg-amber-600/30 transition-colors"
          aria-label="Editar participante"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          </svg>
        </button>
      </td>
    </tr>
  );

  const renderAssetRow = (asset: any) => (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-100 truncate max-w-[200px]">
        {asset.title || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {asset.type || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {asset.episode_id ? <span>Ep {asset.episode_id.slice(0,8)}</span> : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {asset.status ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${asset.status === 'pending' ? 'bg-amber-900/30 text-amber-300' : 'bg-green-900/30 text-green-300'}`}>
            {asset.status}
          </span>
        ) : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
        {asset.created_at ? new Date(asset.created_at).toLocaleDateString('pt-BR') : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
        <button
          className="px-2 py-1 bg-amber-600/20 text-amber-300 text-xs rounded hover:bg-amber-600/30 transition-colors"
          aria-label="Ver asset"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 12 4 12.732 4 14S3.732 16 4 16s.732 4 2.458 4" />
          </svg>
        </button>
      </td>
    </tr>
  );

  const renderRows = () => {
    switch (activeTab) {
      case 'programs':
        return data.map(renderProgramRow);
      case 'episodes':
        return data.map(renderEpisodeRow);
      case 'participants':
        return data.map(renderParticipantRow);
      case 'assets':
        return data.map(renderAssetRow);
      default:
        return null;
    }
  };

  const renderSearchResults = () => {
    if (!searchResults) return null;
    const { programs, episodes, participants } = searchResults;
    return (
       <div className="fixed inset-0 z-50 bg-black-80 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-zinc-100">Resultados da busca</h3>
            <button onClick={() => setShowSearchResults(false)} className="text-zinc-400 hover:text-zinc-200">✕</button>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {searchResults.programs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Programas ({searchResults.programs.length})</h4>
                <div className="space-y-2">
                  {searchResults.programs.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 cursor-pointer">
                       <p className="text-sm font-medium text-zinc-100">{p.title || 'Sem titulo'}</p>
                       <p className="text-xs text-zinc-400">{p.format} • {p.host} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                     </div>
                    ))
           </div>
                 </div>
               </div>
              {searchResults.episodes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-400 mb-2 mt-4">Episódios ({searchResults.episodes.length})</h4>
                <div className="space-y-2">
                  {searchResults.episodes.slice(0, 5).map((ep: any) => (
                    <div key={ep.id} className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 cursor-pointer">
                      <p className="text-sm font-medium text-zinc-100">{ep.title || 'Sem título'}</p>
                      <p className="text-xs text-zinc-400">{ep.status} • {new Date(ep.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              )}
            {searchResults.participants.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-400 mb-2 mt-4">Participantes ({searchResults.participants.length})</h4>
                <div className="space-y-2">
                  {searchResults.participants.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 cursor-pointer">
                      <p className="text-sm font-medium text-zinc-100">{p.name}</p>
                      <p className="text-xs text-zinc-400">{p.type} • {p.role} • {p.company || 'Sem empresa'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100">Catálogo</h1>
          </div>
          <p className="text-xs text-zinc-400">Visão unificada de programas, episódios, participantes e assets</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar programas, episódios, participantes..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {showSearchResults && (
              <button onClick={() => setShowSearchResults(false)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard label="Programas" value={stats.totalPrograms} icon={<Film className="w-5 h-5" />} color="text-amber-400" />
            <StatCard label="Episódios" value={stats.totalEpisodes} icon={<Clapperboard className="w-5 h-5" />} color="text-blue-400" />
            <StatCard label="Participantes" value={stats.totalParticipants} icon={<Users className="w-5 h-5" />} color="text-green-400" />
            <StatCard label="Assets" value={stats.totalAssets} icon={<Image className="w-5 h-5" />} color="text-purple-400" />
            <StatCard label="Shorts" value={stats.totalShorts} icon={<Scissors className="w-5 h-5" />} color="text-pink-400" />
            <StatCard label="Segmentos" value={stats.totalSegments} icon={<Clapperboard className="w-5 h-5" />} color="text-purple-400" />
                 </div>
               </div>
               })

        {/* Search Results Modal */}
        {showSearchResults && renderSearchResults()}

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-4">
          {Object.entries(TAB_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ' + (
                activeTab === key
                  ? 'border-b-2 border-amber-500 text-amber-400 bg-zinc-900/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              {config.icon}
              <span>{config.label}</span>
            </button>
          ))}

        </div>

        {/* Data Table */}
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              Nenhum registro encontrado
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/50">
                      {TAB_CONFIG[activeTab].columns.map((col, i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">{col}</th>
                      }}})}
                    </tr>
                  </thead>
                  <tbody>
                    {renderRows()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <div className="text-sm text-zinc-400">
                  Página {pagination.page} de {pagination.totalPages} — {pagination.count} registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={'px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors ' + (pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : '')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 rounded">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>
                </div>
              </div>
            </div>

            {showSearchResults && renderSearchResults()}

          </div>
        </div>
      </div>
    );
  };

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-zinc-900/50 text-amber-400">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-100">{value.toLocaleString()}</p>
        <p className="text-xs text-zinc-400">{label}</p>
      </div>
    </div>
  </div>
);

export default CatalogView;'.replace(/  }}/g, '}');
EOF
