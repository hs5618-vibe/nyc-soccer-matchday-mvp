"use client";

import "./globals.css";
import AuthStatusClient from "../components/AuthStatus";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isAdmin } from "@/lib/admin";
import { getUserVenues } from "@/lib/venueAdmin";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isVenueOwner, setIsVenueOwner] = useState(false);

  useEffect(() => {
    async function checkUserStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // Check if admin
        const adminCheck = await isAdmin(user.id);
        setIsUserAdmin(adminCheck);
        
        // Check if venue owner
        const venues = await getUserVenues(user.id);
        setIsVenueOwner(venues.length > 0);
      } else {
        setUserId(null);
        setIsUserAdmin(false);
        setIsVenueOwner(false);
      }
    }

    checkUserStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                ⚽
              </div>
              <span className="font-bold text-xl text-gray-900">
                NYC Soccer Matchday
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {isVenueOwner && (
                <Link 
                  href="/manage" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Manage
                </Link>
              )}
              
              {isUserAdmin && (
                <Link 
                  href="/admin" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Admin
                </Link>
              )}
              
              <AuthStatusClient />
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-gray-200 bg-gray-50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-gray-600">
            <p>NYC only • Live bar updates • Built for fans</p>
          </div>
        </footer>
      </body>
    </html>
  );
}