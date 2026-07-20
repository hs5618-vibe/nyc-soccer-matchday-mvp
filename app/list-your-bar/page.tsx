"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const LEAGUES = [
  "World Cup",
  "Champions League",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Eredivisie",
  "Primeira Liga",
  "Brasileirao",
  "Championship",
  "Other",
];

const NEIGHBORHOODS = [
  "Astoria","Astoria Park","Bay Ridge","Bed-Stuy","Bowery","Bronx",
  "Bushwick","Carroll Gardens","Chelsea","Cobble Hill","Crown Heights",
  "DUMBO","East Village","Elmhurst","Financial District","Flatbush",
  "Flatiron","Fort Greene","Gramercy","Greenpoint","Greenwich Village",
  "Harlem","Hell's Kitchen","Industry City","Jackson Heights",
  "Long Island City","Lower East Side","Meatpacking District","Midtown",
  "Midtown West","Murray Hill","Park Slope","Prospect Heights","SoHo",
  "Staten Island","Sunnyside","Sunset Park","Tribeca","Upper East Side",
  "Upper West Side","West Village","Williamsburg","Other",
];

const CLUBS = [
  'Arsenal FC','Chelsea FC','Liverpool FC','Manchester City FC','Manchester United FC',
  'Tottenham Hotspur FC','Newcastle United FC','Everton FC','Brentford FC',
  'Aston Villa FC','Brighton & Hove Albion FC','West Ham United FC',
  'Wolverhampton Wanderers FC','Fulham FC','Crystal Palace FC','Nottingham Forest FC',
  'AFC Bournemouth','Leicester City FC','Southampton FC',
  'FC Barcelona','Real Madrid CF','Club Atlético de Madrid','FC Bayern München',
  'Borussia Dortmund','Paris Saint-Germain FC','Olympique Lyonnais','Olympique de Marseille',
  'Inter Milan','Juventus FC','AC Milan','AS Roma','SSC Napoli','SS Lazio',
  'FC Porto','SL Benfica','Sporting CP','AFC Ajax','PSV Eindhoven',
  'Boca Juniors','River Plate',
];

const NATIONAL_TEAMS = [
  'Albania','Algeria','Argentina','Australia','Austria','Belgium',
  'Bolivia','Bosnia and Herzegovina','Brazil','Cameroon',
  'Canada','Cape Verde','Chile','Colombia','Congo DR','Costa Rica',"Cote d'Ivoire",
  'Croatia','Cuba','Curacao','Czechia','Denmark','Ecuador','Egypt',
  'El Salvador','England','France','Germany','Ghana','Guatemala','Haiti',
  'Honduras','Indonesia','Iran','Iraq','Italy','Jamaica','Japan','Jordan',
  'Mexico','Morocco','Netherlands','New Zealand','Nigeria','Norway',
  'Panama','Paraguay','Peru','Poland','Portugal','Qatar','Saudi Arabia',
  'Scotland','Senegal','Serbia','Slovakia','Slovenia','South Africa',
  'South Korea','Spain','Sweden','Switzerland','Trinidad and Tobago',
  'Tunisia','Turkey','Ukraine','United States','Uruguay','Uzbekistan',
  'Venezuela','Wales',
];

export default function ListYourBarPage() {
  const [step, setStep] = useState<"landing" | "form" | "success">("landing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    bar_name: "",
    address: "",
    neighborhood: "",
    borough: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    instagram: "",
    website: "",
    bio: "",
    leagues: [] as string[],
    other_leagues: "",
    sound_on: false,
    outdoor_tv: false,
    supported_teams: [] as string[],
    notes: "",
  });

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleLeague(league: string) {
    setForm((prev) => {
      const newLeagues = prev.leagues.includes(league)
        ? prev.leagues.filter((l) => l !== league)
        : [...prev.leagues, league];
      return {
        ...prev,
        leagues: newLeagues,
      };
    });
  }

  function toggleTeam(team: string) {
    setForm((prev) => {
      if (!prev.supported_teams.includes(team) && prev.supported_teams.length >= 5) return prev;
      return {
        ...prev,
        supported_teams: prev.supported_teams.includes(team)
          ? prev.supported_teams.filter(t => t !== team)
          : [...prev.supported_teams, team]
      };
    });
  }

  async function handleSubmit() {
    if (!form.bar_name || !form.address || !form.contact_email || !form.contact_phone) {
      setError("Please fill in bar name, address, phone number, and contact email.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: dbError } = await supabase.from("bar_submissions").insert({
      bar_name: form.bar_name,
      address: form.address,
      neighborhood: form.neighborhood,
      borough: form.borough,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      instagram: form.instagram.replace("@", ""),
      website: form.website,
      bio: form.bio,
      leagues: form.leagues,
      other_leagues: form.other_leagues,
      sound_on: form.sound_on,
      outdoor_tv: form.outdoor_tv,
      supported_teams: form.supported_teams,
      notes: form.notes,
      status: "pending",
    });

    setSubmitting(false);

    if (dbError) {
      setError(`Error: ${dbError.message} | Code: ${dbError.code} | Details: ${dbError.details}`);
      return;
    }

    setStep("success");
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6">⚽</div>
          <h1 className="text-3xl font-black text-white mb-3">You're on the list!</h1>
          <p className="text-gray-400 mb-6">
            Thanks for submitting <span className="text-white font-semibold">{form.bar_name}</span>. We'll review your details and get your bar live within 48 hours. We'll reach out to <span className="text-white font-semibold">{form.contact_email}</span> once you're set up.
          </p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-all">
            Back to awaydayz
          </Link>
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <button
            onClick={() => setStep("landing")}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h1 className="text-3xl font-black text-white mb-1">List your bar</h1>
          <p className="text-gray-400 mb-8 text-sm">Takes 2 minutes. We'll review and have you live within 48 hours.</p>

          <div className="space-y-6">

            {/* Bar Info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Bar details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bar name *</label>
                  <input
                    type="text"
                    value={form.bar_name}
                    onChange={(e) => update("bar_name", e.target.value)}
                    placeholder="e.g. The Grafton"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Address * <span className="text-gray-600">(include street, NYC)</span></label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="e.g. 126 W 13th St, New York, NY 10011"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Neighborhood</label>
                    <select
                      value={form.neighborhood}
                      onChange={(e) => update("neighborhood", e.target.value)}
                      className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {NEIGHBORHOODS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Borough</label>
                    <select
                      value={form.borough}
                      onChange={(e) => update("borough", e.target.value)}
                      className="w-full bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option>Manhattan</option>
                      <option>Brooklyn</option>
                      <option>Queens</option>
                      <option>Bronx</option>
                      <option>Staten Island</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tell fans about your bar</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value.slice(0, 300))}
                    placeholder="Atmosphere, number of screens, specials on matchdays..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-600 text-right mt-1">{form.bio.length}/300</p>
                </div>
              </div>
            </div>

            {/* What you show */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-1 text-sm uppercase tracking-wide">What do you show?</h2>
              <p className="text-gray-500 text-xs mb-4">Select all leagues and sports you regularly screen. This is how fans find you.</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {LEAGUES.map((league) => (
                  <button
                    key={league}
                    type="button"
                    onClick={() => toggleLeague(league)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      form.leagues.includes(league)
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    {league}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">Are you a home bar for any club or national team?</label>
                <p className="text-xs text-gray-600 mb-3">These badges will appear next to your bar name and fans searching for these teams will find you first. Max 5.</p>
                <p className="text-xs text-gray-500 font-semibold mb-2">🏟️ Clubs</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CLUBS.map((team) => (
                    <button
                      key={team}
                      type="button"
                      onClick={() => toggleTeam(team)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        form.supported_teams.includes(team)
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {team}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 font-semibold mb-2">🌍 National Teams</p>
                <div className="flex flex-wrap gap-2">
                  {NATIONAL_TEAMS.map((team) => (
                    <button
                      key={team}
                      type="button"
                      onClick={() => toggleTeam(team)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        form.supported_teams.includes(team)
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {team}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">{form.supported_teams.length}/5 selected</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={form.sound_on}
                  onChange={(e) => update("sound_on", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white font-semibold">🔊 We always have sound on during matches</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={form.outdoor_tv}
                  onChange={(e) => update("outdoor_tv", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white font-semibold">📺 We have an outdoor TV or screen</span>
              </label>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Anything else? (teams, other sports)</label>
                <input
                  type="text"
                  value={form.other_leagues}
                  onChange={(e) => update("other_leagues", e.target.value)}
                  placeholder="e.g. Real Madrid matches, rugby, Formula 1..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Your contact info</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Your name</label>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(e) => update("contact_name", e.target.value)}
                      placeholder="First name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email *</label>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => update("contact_email", e.target.value)}
                      placeholder="you@yourbar.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Phone * <span className="text-gray-600">(we'll use this to confirm your listing)</span></label>
                    <input
                      type="tel"
                      value={form.contact_phone}
                      onChange={(e) => update("contact_phone", e.target.value)}
                      placeholder="212-555-0100"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Instagram (optional)</label>
                    <input
                      type="text"
                      value={form.instagram}
                      onChange={(e) => update("instagram", e.target.value)}
                      placeholder="@yourbar"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Website (optional)</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="https://yourbar.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Anything else we should know?</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Private events, big screens, capacity, specials..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Submitting..." : "Submit your bar →"}
            </button>

            <p className="text-center text-xs text-gray-600">
              We review every submission and aim to have you live within 48 hours. Questions? <a href="mailto:awaydayz.app@gmail.com" className="text-gray-400 hover:text-white">awaydayz.app@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-10 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to awaydayz
        </Link>

        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Get your bar in front of<br />
            <span className="text-blue-400">every football fan in NYC</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            awaydayz helps fans find the right bar for every match. List your venue free — takes 2 minutes.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { value: "100+", label: "bars listed" },
            { value: "ALL", label: "WC matches listed" },
            { value: "Free", label: "always" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-2xl font-black text-white mb-1">{value}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: "📍",
              title: "Fans find you",
              body: "When someone searches for a bar showing their team's match, your bar comes up — sorted by match, league, and neighbourhood.",
            },
            {
              icon: "✅",
              title: "You own your page",
              body: "Log in at any time to update which leagues and matches you're showing, add photos, and post matchday updates.",
            },
            {
              icon: "📸",
              title: "Instagram collabs",
              body: "We're posting one bar collab per day on @awaydayz_app. Get listed and we'll reach out to feature you.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="text-white font-bold mb-2 text-sm">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10">
          <h2 className="text-white font-bold mb-5 text-sm uppercase tracking-wide">How it works</h2>
          <div className="space-y-4">
            {[
              { n: "1", text: "Fill in your bar's details — name, address, what you show." },
              { n: "2", text: "We review and have your bar live within 48 hours." },
              { n: "3", text: "You get a login link to manage your page, update matches, and add photos anytime." },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {n}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStep("form")}
          className="w-full bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all mb-4"
        >
          List your bar — it's free →
        </button>

        <p className="text-center text-xs text-gray-600">
          Already listed? <Link href="/login" className="text-gray-400 hover:text-white">Sign in to manage your page</Link> · Questions? <a href="mailto:awaydayz.app@gmail.com" className="text-gray-400 hover:text-white">awaydayz.app@gmail.com</a>
        </p>
      </div>
    </div>
  );
}