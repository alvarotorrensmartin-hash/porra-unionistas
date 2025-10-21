// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !displayName) {
      setErrorMsg("Rellena Nick y Email.");
      return;
    }
    try {
      setStatus("sending");

      // Guarda el nick en cookie temporal (1 hora)
      document.cookie = `pending_display_name=${encodeURIComponent(displayName)}; Path=/; Max-Age=3600; SameSite=Lax`;

      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });
      
      setStatus("sent");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error enviando el email.");
      setStatus("error");
    }
  };

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Entrar a la porra</h1>
      <p className="text-sm mb-4">
        Introduce tu <strong>Nick</strong> (nombre visible en la clasificación) y tu <strong>Email</strong>.
        Te enviaremos un enlace mágico para entrar.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Nick</label>
          <input
            className="border rounded p-2 w-full"
            placeholder="ej. Juan (DG)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="border rounded p-2 w-full"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button
          className="bg-black text-white px-4 py-2 rounded"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Enviando..." : "Entrar"}
        </button>

        {status === "sent" && (
          <p className="text-green-700 text-sm">
            ¡Listo! Revisa tu correo y entra con el enlace.
          </p>
        )}
        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
      </form>
    </main>
  );
}
