'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [invite, setInvite] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joinMode = process.env.NEXT_PUBLIC_JOIN_MODE ?? 'open';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);

    if (!email || !nick) {
      setError('Pon tu email y un nombre visible.');
      return;
    }
    if ((process.env.NEXT_PUBLIC_JOIN_MODE === 'invite') && !invite) {
      setError('Falta el código de invitación.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          displayName: nick,
          inviteCode: invite || null,
        },
        shouldCreateUser: true,
      },
    });

    if (error) setError(error.message);
    else setMsg('Te hemos enviado un enlace de acceso a tu email. Revisa tu bandeja.');
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Entrar</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="text"
          className="w-full border rounded p-2"
          placeholder="Tu nick (visible)"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          required
        />
        <input
          type="email"
          className="w-full border rounded p-2"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {(process.env.NEXT_PUBLIC_JOIN_MODE === 'invite') && (
          <input
            type="text"
            className="w-full border rounded p-2"
            placeholder="Código de invitación"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            required
          />
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Recibir enlace
        </button>
      </form>
      {msg && <p className="text-green-600 mt-4">{msg}</p>}
      {error && <p className="text-red-600 mt-4">{error}</p>}
      <p className="text-sm text-gray-400 mt-4">
        {joinMode === 'open'
          ? 'Registro abierto.'
          : joinMode === 'invite'
          ? 'Se requiere código de invitación.'
          : 'Modo lista blanca (solo emails autorizados).'}
      </p>
    </main>
  );
}
