"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: "http://localhost:3000" },
    });

    if (error) setMsg(error.message);
    else setMsg("Magic link sent. Check your email.");

    setLoading(false);
  }

  return (
    <main className="p-6 font-sans max-w-md">
      <Link href="/" className="text-blue-600 text-sm underline">
        ← Back
      </Link>

      <h1 className="text-2xl font-bold mt-4">Log in</h1>
      <p className="mt-2 text-gray-600">Enter your email to get a magic link.</p>

      <input
        className="mt-6 w-full border rounded px-3 py-2"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        className="mt-4 w-full bg-black text-white rounded px-4 py-3 disabled:opacity-50"
        disabled={!email || loading}
        onClick={sendLink}
      >
        {loading ? "Sending…" : "Send magic link"}
      </button>

      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </main>
  );
}
