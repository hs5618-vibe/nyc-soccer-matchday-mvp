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

    const redirectTo = typeof window !== "undefined" 
      ? `${window.location.origin}`
      : "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) setMsg(error.message);
    else setMsg("Magic link sent! Check your email.");

    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-8">
      
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>

          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
              <p className="text-gray-600">Sign in to mark yourself as going and post updates</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && email && !loading && sendLink()}
                />
              </div>

              <button
                onClick={sendLink}
                disabled={!email || loading}
                className="w-full bg-blue-600 text-white px-6 py-3 text-base font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>

              {msg && (
                <div className={`p-4 rounded-lg text-sm ${
                  msg.includes("sent") 
                    ? "bg-green-50 border border-green-200 text-green-800" 
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}>
                  {msg}
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                We'll email you a magic link for a password-free sign in
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}