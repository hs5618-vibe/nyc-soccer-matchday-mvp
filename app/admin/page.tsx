"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";

type Claim = {
  id: string;
  venue_id: string;
  user_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  status: string;
  created_at: string;
  venues: {
    name: string;
    neighborhood: string;
  };
};

type VenueAdmin = {
  id: string;
  venue_id: string;
  user_id: string;
  venues: {
    name: string;
  };
  profiles: {
    username: string;
  } | null;
};

type Report = {
  id: string;
  update_id: string;
  reported_by: string;
  reason: string;
  created_at: string;
  updates: {
    message: string;
    venue_id: string;
    venues: {
      name: string;
    };
  };
};

export default function AdminPage() {
  const router = useRouter();
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [venueAdmins, setVenueAdmins] = useState<VenueAdmin[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"claims" | "admins" | "reports">("claims");
  const [stats, setStats] = useState({
    totalVenues: 0,
    pendingClaims: 0,
    venueAdmins: 0,
    totalShowings: 0,
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const adminCheck = await isAdmin(user.id);
      if (!adminCheck) {
        router.push("/");
        return;
      }

      await Promise.all([
        loadClaims(),
        loadVenueAdmins(),
        loadReports(),
        loadStats(),
      ]);

      setLoading(false);
    }

    loadData();
  }, [router]);

  async function loadStats() {
    const [venuesResult, claimsResult, adminsResult, showingsResult] = await Promise.all([
      supabase.from("venues").select("id", { count: "exact", head: true }),
      supabase.from("venue_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("venue_admins").select("id", { count: "exact", head: true }),
      supabase.from("venue_matches").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalVenues: venuesResult.count || 0,
      pendingClaims: claimsResult.count || 0,
      venueAdmins: adminsResult.count || 0,
      totalShowings: showingsResult.count || 0,
    });
  }

  async function loadClaims() {
    const { data } = await supabase
      .from("venue_claims")
      .select(`
        *,
        venues (name, neighborhood)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setPendingClaims(data || []);
  }

  async function loadVenueAdmins() {
    const { data } = await supabase
      .from("venue_admins")
      .select(`
        *,
        venues (name),
        profiles (username)
      `)
      .order("created_at", { ascending: false });

    setVenueAdmins(data || []);
  }

  async function loadReports() {
    const { data } = await supabase
      .from("update_reports")
      .select(`
        *,
        updates (
          message,
          venue_id,
          venues (name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    setReports(data || []);
  }

  async function handleClaim(claimId: string, status: "approved" | "rejected") {
    if (status === "approved") {
      const claim = pendingClaims.find(c => c.id === claimId);
      if (!claim) return;

      await supabase.from("venue_admins").insert({
        venue_id: claim.venue_id,
        user_id: claim.user_id,
      });
    }

    await supabase
      .from("venue_claims")
      .update({ status })
      .eq("id", claimId);

    await loadClaims();
    await loadStats();
    await loadVenueAdmins();
  }

  async function removeAdmin(adminId: string) {
    if (!confirm("Remove this admin?")) return;

    await supabase
      .from("venue_admins")
      .delete()
      .eq("id", adminId);

    await loadVenueAdmins();
    await loadStats();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage venue claims and admins</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <p className="text-sm text-gray-400 mb-1">Total Venues</p>
            <p className="text-3xl font-black text-white">{stats.totalVenues}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <p className="text-sm text-gray-400 mb-1">Pending Claims</p>
            <p className="text-3xl font-black text-blue-400">{stats.pendingClaims}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <p className="text-sm text-gray-400 mb-1">Venue Admins</p>
            <p className="text-3xl font-black text-white">{stats.venueAdmins}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <p className="text-sm text-gray-400 mb-1">Total Showings</p>
            <p className="text-3xl font-black text-white">{stats.totalShowings}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("claims")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === "claims"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            Pending Claims ({stats.pendingClaims})
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === "admins"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            Venue Admins
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === "reports"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            Reports ({reports.length})
          </button>
        </div>

        {/* Pending Claims */}
        {activeTab === "claims" && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Pending Claims</h2>
            {pendingClaims.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No pending claims</p>
            ) : (
              <div className="space-y-4">
                {pendingClaims.map((claim) => (
                  <div key={claim.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg text-white mb-1">
                        {claim.venues.name}
                      </h3>
                      <p className="text-sm text-gray-400">{claim.venues.neighborhood}</p>
                    </div>
                    <div className="space-y-2 mb-4 text-sm">
                      <p className="text-gray-300">
                        <span className="text-gray-500">Business:</span> {claim.business_name}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-500">Email:</span> {claim.business_email}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-500">Phone:</span> {claim.business_phone}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Submitted {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleClaim(claim.id, "approved")}
                        className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-full text-sm font-bold hover:bg-green-700 transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleClaim(claim.id, "rejected")}
                        className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-full text-sm font-bold hover:bg-red-700 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Venue Admins */}
        {activeTab === "admins" && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Venue Admins</h2>
            {venueAdmins.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No venue admins</p>
            ) : (
              <div className="space-y-3">
                {venueAdmins.map((admin) => (
                  <div key={admin.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{admin.venues.name}</p>
                      <p className="text-sm text-gray-400">
                        Admin: {admin.profiles?.username || "Unknown user"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAdmin(admin.id)}
                      className="bg-red-600/20 text-red-400 border border-red-600/30 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-600/30 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {activeTab === "reports" && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Update Reports</h2>
            {reports.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No reports</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="mb-3">
                      <p className="font-bold text-white mb-1">
                        {report.updates.venues.name}
                      </p>
                      <p className="text-sm text-gray-300 mb-2">
                        "{report.updates.message}"
                      </p>
                      <p className="text-sm text-red-400">
                        Reason: {report.reason}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Reported {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
