import React from 'react';
import { ArrowRight, Clapperboard, FileVideo, CalendarDays, LibraryBig, ShieldCheck } from 'lucide-react';

const features = [
  { icon: FileVideo, title: 'Produção editorial', description: 'Organize pautas, episódios, pesquisas e roteiros em um único fluxo.' },
  { icon: CalendarDays, title: 'Operação integrada', description: 'Coordene agenda, equipe, estúdio e etapas de produção.' },
  { icon: LibraryBig, title: 'Conhecimento centralizado', description: 'Mantenha referências e assets acessíveis à equipe autorizada.' },
];

export function PublicHome() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
        <a href="/" className="flex items-center gap-3" aria-label="TakeMaster início">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white"><Clapperboard className="h-5 w-5" /></span>
          <span className="text-lg font-semibold tracking-tight">TakeMaster</span>
        </a>
        <nav className="flex items-center gap-3">
          <a href="/login" className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">Entrar</a>
          <a href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Criar conta <ArrowRight className="h-4 w-4" /></a>
        </nav>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Plataforma de produção audiovisual</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Da ideia à gravação, com a produção sob controle.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">Planeje programas, desenvolva pautas e roteiros, organize equipes e acompanhe a operação em um só espaço de trabalho.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Começar agora <ArrowRight className="h-4 w-4" /></a>
            <a href="/login" className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Já tenho uma conta</a>
          </div>
          <p className="mt-4 text-xs text-zinc-500">Acesso ao ambiente de trabalho conforme sua conta e permissões.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4"><div><p className="text-sm font-semibold">Fluxo de produção</p><p className="mt-1 text-xs text-zinc-500">Da pauta à entrega</p></div><ShieldCheck className="h-5 w-5 text-emerald-700" /></div>
          <div className="space-y-3 pt-5">
            {[['01', 'Planejamento editorial', 'Ideias, pesquisa e pauta'], ['02', 'Roteiro e preparação', 'Perguntas, blocos e recursos'], ['03', 'Gravação e operação', 'Equipe, agenda e estúdio']].map(([number, title, description]) => (
              <div key={number} className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-800">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-zinc-500">{description}</p></div></div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="max-w-2xl"><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Uma operação conectada, sem espalhar o trabalho.</h2><p className="mt-3 text-zinc-600">Ferramentas para organizar a rotina editorial e manter cada etapa visível para quem tem acesso.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, description }) => (<article key={title} className="rounded-xl border border-zinc-200 bg-white p-5"><Icon className="h-5 w-5 text-emerald-700" /><h3 className="mt-4 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p></article>))}</div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>TakeMaster · Produção audiovisual organizada</span><a href="/login" className="font-medium text-zinc-700 hover:text-emerald-800">Acessar plataforma</a></footer>
    </main>
  );
}
export default PublicHome;
