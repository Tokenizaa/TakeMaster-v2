export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${minutes} min`;
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Rascunho',
    diagnosis: 'Diagnóstico Editorial',
    research: 'Em Pesquisa',
    outline: 'Em Pauta',
    scripting: 'Em Roteirização',
    ready: 'Pronto para Gravar',
    recording: 'Gravando',
    recorded: 'Gravado',
    editing: 'Em Edição',
    published: 'Publicado',
  };
  return map[status] || status;
}

export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'ready':
      return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
    case 'recording':
      return 'text-red-400 bg-red-950/60 border-red-800/60 animate-pulse';
    case 'recorded':
    case 'editing':
      return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
    case 'published':
      return 'text-sky-400 bg-sky-950/60 border-sky-800/60';
    case 'scripting':
    case 'outline':
      return 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60';
    default:
      return 'text-zinc-400 bg-zinc-900 border-zinc-800';
  }
}

export function getCameraColor(cameraName: string = ''): { bg: string; text: string; border: string; badge: string } {
  const clean = cameraName.toUpperCase();
  if (clean.includes('BANDA') || clean.includes('CAM 4') || clean.includes('MUSICAL')) {
    return {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      badge: 'bg-purple-600 text-white',
    };
  }
  if (clean.includes('PLATEIA') || clean.includes('AUDITÓRIO') || clean.includes('CAM 5')) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-600 text-white',
    };
  }
  if (clean.includes('CAM 1') || clean.includes('FRONTAL') || clean.includes('GERAL')) {
    return {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      badge: 'bg-red-500 text-white',
    };
  }
  if (clean.includes('CAM 2') || clean.includes('APRESENTADOR')) {
    return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500 text-zinc-950',
    };
  }
  if (clean.includes('CAM 3') || clean.includes('CONVIDADO') || clean.includes('SOFÁ')) {
    return {
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      badge: 'bg-sky-500 text-zinc-950',
    };
  }
  return {
    bg: 'bg-zinc-800',
    text: 'text-zinc-300',
    border: 'border-zinc-700',
    badge: 'bg-zinc-700 text-white',
  };
}

export function getCameraColorClass(cameraName: string = ''): string {
  const c = getCameraColor(cameraName);
  return `${c.bg} ${c.text} ${c.border}`;
}
