"use client";

import { useState } from "react";
import { createProfile, checkUsernameAvailable } from "@/lib/profiles";

type UsernameModalProps = {
  userId: string;
  onComplete: (username: string) => void;
};

export default function UsernameModal({ userId, onComplete }: UsernameModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const available = await checkUsernameAvailable(username);
      if (!available) {
        setError("Username is already taken");
        setLoading(false);
        return;
      }

      await createProfile(userId, username);
      onComplete(username);
    } catch (err: any) {
      setError(err.message || "Failed to create username");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Username</h2>
        <p className="text-gray-600 mb-6">
          This will be displayed when you post updates and mark bars as "going"
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., soccerfan123"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !username.trim()}
            className="w-full bg-blue-600 text-white px-6 py-3 text-base font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Creating..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}