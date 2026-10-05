import React, { useEffect, useState } from 'react';
import { isSupabaseBrowserConfigured, supabase } from '../lib/supabase';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(!isSupabaseBrowserConfigured);
  const [session, setSession] = useState<any>(null);
  const [bypassToInternalAuth, setBypassToInternalAuth] = useState(!isSupabaseBrowserConfigured);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseBrowserConfigured || !supabase) {
      setReady(true);
      setBypassToInternalAuth(true);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setReady(true);
      })
      .catch(() => {
        setBypassToInternalAuth(true);
        setReady(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        Carregando autenticação...
      </div>
    );
  }

  // If Supabase client env vars are not configured or user selects RSPlay TV SaaS Login, render App directly
  if (bypassToInternalAuth || session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          if (!supabase) {
            setBypassToInternalAuth(true);
            return;
          }
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) setError(signInError.message);
        }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">RSPlay TV — TakeMaster V2</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-amber-500 text-black font-semibold"
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setBypassToInternalAuth(true)}
          className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
        >
          Continuar com Portal de Login RSPlay TV SaaS
        </button>
      </form>
    </div>
  );
};
