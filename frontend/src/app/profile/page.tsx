"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram } from "react-icons/fa";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    };
    getUser();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c] p-4">
      <div className="w-full max-w-3xl flex flex-col gap-8">
        {loading ? (
          <div className="text-center text-[#a259e6] p-10 glass-box">
            Loading...
          </div>
        ) : user ? (
          <>
            {/* Avatar & Name Box */}
            <div className="glass-box flex flex-col md:flex-row items-center gap-6 p-8">
              <div className="w-28 h-28 rounded-full border-4 border-[#a259e6] bg-[#23283a] overflow-hidden flex items-center justify-center shadow-lg">
                <span className="text-5xl text-[#a259e6] font-bold">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center md:items-start gap-2">
                <span className="text-2xl md:text-3xl font-bold text-white tracking-wide">
                  {user.user_metadata?.full_name ||
                    user.user_metadata?.company ||
                    "User"}
                </span>
                <span className="text-white/80 text-base md:text-lg">
                  {user.email}
                </span>
              </div>
            </div>
         
            {/* About Box */}
            <div className="glass-box p-8">
              <h3 className="text-lg font-bold text-[#a259e6] mb-2">About</h3>
              <p className="text-white/90 text-sm">
                {user.user_metadata?.about || "No bio provided."}
              </p>
            </div>
            {/* Info Box */}
            <div className="glass-box grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              <div className="flex flex-col gap-2 items-center">
                <span className="text-xs text-[#a259e6] font-bold">
                  Location
                </span>
                <span className="text-white text-lg">
                  {user.user_metadata?.location || "-"}
                </span>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <span className="text-xs text-[#a259e6] font-bold">
                  Company
                </span>
                <span className="text-white text-lg">
                  {user.user_metadata?.company || "-"}
                </span>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <span className="text-xs text-[#a259e6] font-bold">Joined</span>
                <span className="text-white text-lg">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {/* Social & Links Box */}
            <div className="glass-box flex flex-col md:flex-row items-center justify-between gap-4 p-6">
              <div className="flex gap-4">
                <a
                  href={user.user_metadata?.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#a259e6] hover:text-[#00e6e6] text-xl font-bold"
                >
                  {user.user_metadata?.website
                    ? user.user_metadata.website.replace(/^https?:\/\//, "")
                    : "Website"}
                </a>
              </div>
              <div className="flex gap-4 text-2xl">
                <a
                  href={user.user_metadata?.facebook || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00e6e6] text-[#a259e6]"
                >
                  <FaFacebook />
                </a>
                
                <a
                  href={user.user_metadata?.linkedin || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00e6e6] text-[#a259e6]"
                >
                  <FaLinkedin />
                </a>
                <a
                  href={user.user_metadata?.instagram || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00e6e6] text-[#a259e6]"
                >
                  <FaInstagram />
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-red-400 p-10 glass-box">
            No user found. Please log in.
          </div>
        )}
      </div>
    </div>
  );
  // Glassmorphism utility class
  // Add this to your global CSS (e.g., globals.css):
  // .glass-box {
  //   @apply rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg;
  // }
}
