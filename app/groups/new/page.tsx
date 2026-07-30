"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createGroup } from "@/lib/groups";

export default function NewGroupPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      setCheckingAuth(false);
    }
    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    if (!name.trim() || !teamName.trim()) {
      setError("Group name and team/country are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const group = await createGroup({
      name: name.trim(),
      teamName: teamName.trim(),
      description: description.trim(),
      instagram: instagram.trim(),
      userId,
    });

    setSubmitting(false);

    if (!group) {
      setError("Something went wrong creating the group. Please try again.");
      return;
    }

    router.push(`/groups/${group.id}`);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] font-sans">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        <Link href="/groups" className="text-sm text-brand-green-400 hover:text-brand-green-100 font-medium inline-flex items-center gap-1 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to groups
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">Start a Supporter Group</h1>
        <p className="text-gray-400 text-sm mb-8">
          Create a home for fans of your club or country in NYC. You can link it to a venue where you watch matches later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Group name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NYC Gunners"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Club or country *</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Arsenal FC"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Tell fans what your group is about..."
              rows={3}
              maxLength={500}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            <p className="text-xs text-gray-500 text-right mt-1">{description.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Instagram (optional)</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourgroup"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-green text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-brand-green-600 disabled:opacity-50 transition-all"
          >
            {submitting ? "Creating..." : "Create Group"}
          </button>
        </form>

      </div>
    </div>
  );
}