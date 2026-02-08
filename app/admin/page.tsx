"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  isAdmin,
  getPendingClaims,
  getAllVenueAdmins,
  approveClaim,
  rejectClaim,
  getAdminStats,
  type VenueClaim,
} from "@/lib/admin";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingClaims, setPendingClaims] = useState<VenueClaim[]>([]);
  const [venueAdmins, setVenueAdmins] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVenues: 0,
    totalClaims: 0,
    totalAdmins: 0,
    totalShowings: 0,
  });
  const [activeTab, setActiveTab] = useState<"claims" | "admins" | "stats">("claims");

  useEffect(() => {
    async function checkAdmin() {
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

      setUserId(user.id);
      await loadData();
      setLoading(false);
    }

    checkAdmin();
  }, [router]);

  async function loadData() {
    const [claims, admins, statistics] = await Promise.all([
      getPendingClaims(),
      getAllVenueAdmins(),
      getAdminStats(),
    ]);

    setPendingClaims(claims);
    setVenueAdmins(admins);
    setStats(statistics);
  }

  async function handleApprove(claim: VenueClaim) {
    if (!userId) return;

    try {
      await approveClaim(claim.id, claim.user_id, claim.venue_id);
      alert("Claim approved!");
      await loadData();
    } catch (error) {
      console.error("Error approving claim:", error);
      alert("Failed to approve claim");
    }
  }

  async function handleReject(claimId: string) {
    if (!userId) return;

    if (!confirm("Are you sure you want to reject this claim?")) return;

    try {
      await rejectClaim(claimId, userId);
      alert("Claim rejected");
      await loadData();
    } catch (error) {
      console.error("Error rejecting claim:", error);
      alert("Failed to reject claim");
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-lg text-gray-600">Manage venue claims and admins</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Total Venues</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalVenues}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Pending Claims</p>
          <p className="text-3xl font-bold text-blue-600">{pendingClaims.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Venue Admins</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAdmins}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500 mb-1">Total Showings</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalShowings}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("claims")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "claims"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Pending Claims ({pendingClaims.length})
        </button>
        <button
          onClick={() => setActiveTab("admins")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "admins"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Venue Admins
        </button>
      </div>

      {/* Pending Claims Tab */}
      {activeTab === "claims" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Pending Claims</h2>

          {pendingClaims.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-600">No pending claims</p>
            </div>
          ) : (
            pendingClaims.map((claim) => (
              <div key={claim.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {claim.venues?.name || "Unknown Venue"}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {claim.venues?.neighborhood || "Unknown Location"}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Business:</span> {claim.business_name}</p>
                      <p><span className="font-medium">Email:</span> {claim.business_email}</p>
                      <p><span className="font-medium">Phone:</span> {claim.business_phone}</p>
                      <p className="text-gray-500">
                        Submitted: {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(claim)}
                    className="bg-green-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-green-700 transition-all"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReject(claim.id)}
                    className="bg-red-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-red-700 transition-all"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Venue Admins Tab */}
      {activeTab === "admins" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">All Venue Admins</h2>

          {venueAdmins.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-600">No venue admins yet</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Venue</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {venueAdmins.map((admin, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm text-gray-900">
                        {admin.venues?.name || "Unknown"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {admin.venues?.neighborhood || "Unknown"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {new Date(admin.added_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}