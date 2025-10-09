'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return <div style={{padding:20}}><h2>Revisa tu correo</h2><p>Te hemos enviado el enlace de acceso.</p></div>;
  }

  return (
    <section style={{maxWidth:420, margin:'48px auto'}}>
      <h1>Entrar</h1>
      <form onSubmit={sendLink} style={{display:'grid', gap:12}}>
        <input
          type="email"
          required
          placeholder="tu@unionistas.com"
          value={email}
          onChange={e=>setEmail(e.target.value)}
        />
        <button className="btn" type="submit">Recibir enlace</button>
        {error && <p style={{color:'salmon'}}>{error}</p>}
      </form>
    </section>
  );
}
