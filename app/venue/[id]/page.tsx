"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchGoingCount, insertGoing, hasUserGone } from "@/lib/going";
import { fetchVenueById } from "@/lib/venues";
import { supabase } from "@/lib/supabaseClient";
import { getVenueClaimStatus, claimVenue } from "@/lib/venueAdmin";
import { getProfile, type UserProfile, reportUpdate } from "@/lib/profiles";
import UsernameModal from "@/components/UsernameModal";

type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  bar_type: string;
  club_name: string | null;
};

type Update = {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
};

type UpdateWithProfile = Update & {
  profile?: UserProfile | null;
};

export default function VenuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const matchId = searchParams.get("match") || "man-utd-v-liverpool";
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [userAlreadyGoing, setUserAlreadyGoing] = useState(false);
  const [goingCount, setGoingCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<UpdateWithProfile[]>([]);
  const [updateMessage, setUpdateMessage] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [claimStatus, setClaimStatus] = useState<any>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [reportingUpdateId, setReportingUpdateId] = useState<string | null>(null);

  useEffect(() => {
    async function loadVenueAndGoingData() {
      if (!id) return;

      const venueData = await fetchVenueById(id);
      setVenue(venueData);
      setLoading(false);

      if (!venueData) return;

      const count = await fetchGoingCount({ matchId, venueId: venueData.id });
      setGoingCount(count);

      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (user?.id) {
        const alreadyGoing = await hasUserGone({ matchId, venueId: venueData.id, userId: user.id });
        setUserAlreadyGoing(alreadyGoing);
        
        const status = await getVenueClaimStatus(user.id, venueData.id);
        setClaimStatus(status);

        const profile = await getProfile(user.id);
        setUserProfile(profile);
      }

      await loadUpdates(venueData.id);
    }

    loadVenueAndGoingData();
  }, [id, matchId]);

  async function loadUpdates(venueId: string) {
    const { data, error } = await supabase
      .from("updates")
      .select("id, message, created_at, user_id")
      .eq("match_id", matchId)
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching updates:", error);
      return;
    }

    // Fetch profiles for each update
    const updatesWithProfiles = await Promise.all(
      (data || []).map(async (update) => {
        const profile = await getProfile(update.user_id);
        return { ...update, profile };
      })
    );

    setUpdates(updatesWithProfiles);
  }

  async function handlePostUpdate() {
    if (!userId || !venue) return;

    // Check if user has a profile/username
    if (!userProfile) {
      setShowUsernameModal(true);
      return;
    }

    setPostingUpdate(true);

    const { error } = await supabase
      .from("updates")
      .insert({
        match_id: matchId,
        venue_id: venue.id,
        user_id: userId,
        message: updateMessage,
      });

    if (error) {
      console.error("Error posting update:", error);
      alert("Failed to post update");
    } else {
      setUpdateMessage("");
      await loadUpdates(venue.id);
    }

    setPostingUpdate(false);
  }

  async function handleClaimSubmit() {
    if (!venue) return;
    
    setSubmittingClaim(true);
    
    try {
      await claimVenue(venue.id, claimForm);
      alert("Claim submitted! We'll review it shortly.");
      setShowClaimModal(false);
      const status = await getVenueClaimStatus(userId!, venue.id);
      setClaimStatus(status);
    } catch (error: any) {
      alert("Failed to submit claim: " + error.message);
    }
    
    setSubmittingClaim(false);
  }

  async function handleReport(updateId: string) {
    if (!userId) return;

    const reason = prompt("Why are you reporting this update?");
    if (!reason) return;

    try {
      await reportUpdate(updateId, userId, reason);
      alert("Update reported. We'll review it shortly.");
      setReportingUpdateId(null);
    } catch (error) {
      alert("Failed to report update");
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Venue not found</h1>
          <p className="text-gray-600 mb-6">Sorry, we couldn't find that venue.</p>
          <Link href={`/results?match=${matchId}`}>
            <button className="bg-gray-100 text-gray-900 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all">
              ← Back to results
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const barTypeDisplay =
    venue.bar_type === "club" && venue.club_name
      ? `Club-Specific: ${venue.club_name}`
      : "General Sports Bar";

  const handleGoing = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }

    // Check if user has username
    if (!userProfile) {
      setShowUsernameModal(true);
      return;
    }

    setGoingCount((prev) => prev + 1);
    setButtonDisabled(true);

    try {
      await insertGoing({ matchId, venueId: venue.id, userId });
      setUserAlreadyGoing(true);
      const refreshedCount = await fetchGoingCount({ matchId, venueId: venue.id });
      setGoingCount(refreshedCount);
      
      // Refresh profile to show updated bars_visited
      const updatedProfile = await getProfile(userId);
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error("Error marking as going:", error);
      setGoingCount((prev) => prev - 1);
      setButtonDisabled(false);
    }
  };

  const getButtonLabel = () => {
    if (!userId) return "Log in to mark going";
    if (userAlreadyGoing) return "You're going ✅";
    return "I'm going";
  };

  const isButtonDisabled = buttonDisabled || userAlreadyGoing;

  const matchLabel = matchId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link 
        href={`/results?match=${matchId}`} 
        className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to results
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{venue.name}</h1>
        <p className="text-lg text-gray-600 mb-3">{venue.neighborhood}</p>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {barTypeDisplay}
        </span>

        {userId && !claimStatus && (
          <button
            onClick={() => setShowClaimModal(true)}
            className="mt-4 bg-gray-100 text-gray-900 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all"
          >
            🏪 Claim this venue
          </button>
        )}

        {claimStatus && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              {claimStatus.status === 'pending' && '⏳ Claim pending review'}
              {claimStatus.status === 'approved' && '✅ You manage this venue'}
              {claimStatus.status === 'rejected' && '❌ Claim was rejected'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Today's Match</p>
            <p className="font-semibold text-gray-900">{matchLabel}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mb-6">
          <p className="text-2xl font-bold text-gray-900">
            {goingCount} {goingCount === 1 ? "person" : "people"} going
          </p>
        </div>

        <button
          onClick={handleGoing}
          disabled={isButtonDisabled}
          className="w-full bg-blue-600 text-white px-6 py-3 text-base font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {getButtonLabel()}
        </button>

        {userProfile && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              You've been to <span className="font-semibold text-gray-900">{userProfile.bars_visited}</span> bars 🍻
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Live Updates</h2>
          <p className="mt-1 text-sm text-gray-500">See what fans are saying</p>
        </div>

        {userId ? (
          <div className="mb-6">
            <textarea
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              placeholder="Share what's happening at the bar..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="mt-3">
              <button
                onClick={handlePostUpdate}
                disabled={!updateMessage.trim() || postingUpdate}
                className="bg-blue-600 text-white px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {postingUpdate ? "Posting..." : "Post update"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Log in
              </Link>{" "}
              to post updates and join the conversation
            </p>
          </div>
        )}

        <div className="space-y-4">
          {updates.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No updates yet. Be the first to post!</p>
            </div>
          )}
          {updates.map((update) => (
            <div key={update.id} className="border-l-4 border-blue-600 pl-4 py-2 relative group">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {update.profile?.username || "Anonymous"}
                    </span>
                    {update.profile && update.profile.bars_visited > 0 && (
                      <span className="text-xs text-gray-500">
                        • {update.profile.bars_visited} {update.profile.bars_visited === 1 ? 'bar' : 'bars'} visited
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 mb-1">{update.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(update.created_at).toLocaleString()}
                  </p>
                </div>
                
                {userId && userId !== update.user_id && (
                  <button
                    onClick={() => handleReport(update.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-red-600"
                  >
                    Report
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Claim This Venue</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={claimForm.businessName}
                  onChange={(e) => setClaimForm({...claimForm, businessName: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={venue?.name}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email
                </label>
                <input
                  type="email"
                  value={claimForm.businessEmail}
                  onChange={(e) => setClaimForm({...claimForm, businessEmail: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="manager@bar.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={claimForm.businessPhone}
                  onChange={(e) => setClaimForm({...claimForm, businessPhone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(212) 555-0123"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowClaimModal(false)}
                className="flex-1 bg-gray-100 text-gray-900 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimSubmit}
                disabled={submittingClaim || !claimForm.businessEmail}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {submittingClaim ? "Submitting..." : "Submit Claim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUsernameModal && userId && (
        <UsernameModal
          userId={userId}
          onComplete={async (username) => {
            const profile = await getProfile(userId);
            setUserProfile(profile);
            setShowUsernameModal(false);
          }}
        />
      )}
    </div>
  );
}