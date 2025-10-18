"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SignUp() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { company: form.name },
      },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    } else {
      setSuccess("Check your email to confirm your account.");
      setTimeout(() => {
        setLoading(false);
        router.push("/login");
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <svg
          className="animate-spin h-12 w-12 text-[#a259e6]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-stretch bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Left Section */}
      <div className="hidden md:flex flex-col justify-center items-start w-1/2 pl-30 pr-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2d1840] to-[#23283a] flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <span className="text-2xl font-bold text-white tracking-wide">
            IntentMiner
          </span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Unlock Purchase Intent Insights
        </h2>
        <p className="text-white/80 max-w-md mb-8">
          Welcome to IntentMiner, your intelligent platform for predicting and
          analyzing customer purchase intent. Empower your business with
          actionable insights, data-driven recommendations, and a seamless
          experience for your team. Discover trends, optimize strategies, and
          stay ahead in the market with IntentMiner.
        </p>
      </div>
      {/* Right Section (Signup Form) */}
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <h2 className="text-center text-white text-2xl font-semibold mb-2">
            Sign Up
          </h2>
          <h3 className="text-center text-white/80 text-lg mb-6">
            Create Your Account
          </h3>
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div>
              <label className="block text-white/80 text-xs mb-1">
                COMPANY NAME
              </label>
              <div className="flex items-center bg-white/10 rounded-md px-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-white/50 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v4a1 1 0 001 1h1v6a1 1 0 001 1h2a1 1 0 001-1v-6h2v6a1 1 0 001 1h2a1 1 0 001-1v-6h1a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z"
                  />
                </svg>
                <input
                  type="text"
                  className="bg-transparent outline-none py-2 w-full text-white placeholder-white/60"
                  placeholder="Acme Corporation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-white/80 text-xs mb-1">
                COMPANY EMAIL ADDRESS
              </label>
              <div className="flex items-center bg-white/10 rounded-md px-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-white/50 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 12l-4 4-4-4m8-4H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2z"
                  />
                </svg>
                <input
                  type="email"
                  className="bg-transparent outline-none py-2 w-full text-white placeholder-white/60"
                  placeholder="contact@acme.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-white/80 text-xs mb-1">
                PASSWORD
              </label>
              <div className="flex items-center bg-white/10 rounded-md px-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-white/50 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c-1.657 0-3 1.343-3 3v3a3 3 0 003 3 3 3 0 003-3v-3c0-1.657-1.343-3-3-3zm0 0V7a4 4 0 118 0v4"
                  />
                </svg>
                <input
                  type="password"
                  className="bg-transparent outline-none py-2 w-full text-white placeholder-white/60"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-white/80 text-xs mb-1">
                CONFIRM PASSWORD
              </label>
              <div className="flex items-center bg-white/10 rounded-md px-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-white/50 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c-1.657 0-3 1.343-3 3v3a3 3 0 003 3 3 3 0 003-3v-3c0-1.657-1.343-3-3-3zm0 0V7a4 4 0 118 0v4"
                  />
                </svg>
                <input
                  type="password"
                  className="bg-transparent outline-none py-2 w-full text-white placeholder-white/60"
                  placeholder="Password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 mt-2 rounded bg-black/80 text-white font-bold text-lg shadow-md hover:bg-black transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>
            {error && (
              <p className="text-red-300 text-center text-xs mt-2">{error}</p>
            )}
            {success && (
              <p className="text-green-300 text-center text-xs mt-2">
                {success}
              </p>
            )}
            <p className="text-center text-white/80 text-xs mt-2">
              I'm already a member?{" "}
              <a href="/login" className="text-blue-200 hover:underline">
                Sign In
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
