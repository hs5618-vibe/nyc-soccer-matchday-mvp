"use client";

import { useState } from "react";
import { claimVenue } from "@/lib/venueAdmin";

type ClaimVenueModalProps = {
  venueId: string;
  venueName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ClaimVenueModal({
  venueId,
  venueName,
  onClose,
  onSuccess,
}: ClaimVenueModalProps) {
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!businessName.trim() || !businessEmail.trim() || !businessPhone.trim()) {
      setError("All fields are required");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await claimVenue(venueId, {
        businessName: businessName.trim(),
        businessEmail: businessEmail.trim(),
        businessPhone: businessPhone.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit claim. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#10141C] border border-white/10 rounded-3xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Claim This Venue</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-400 mb-6">
          Claim <span className="text-white font-semibold">{venueName}</span> to manage which matches you're showing and post updates.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., The Red Lion NYC LLC"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Email
            </label>
            <input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              placeholder="manager@theredlion.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Phone
            </label>
            <input
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="(212) 555-0123"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          {error && (
            <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-brand-green/10 border border-brand-green-600/20 rounded-xl p-4">
            <p className="text-xs text-brand-green-400">
              Your claim will be reviewed by our team. You'll be notified via email once approved.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 text-white border border-white/10 px-6 py-3 rounded-full font-bold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-brand-green text-white px-6 py-3 rounded-full font-bold hover:bg-brand-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Submitting..." : "Submit Claim"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
