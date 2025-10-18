"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import {
  HomeIcon,
  ChartBarIcon,
  DocumentArrowUpIcon,
  LightBulbIcon,
  UserIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const sidebarItems = [
  { label: "Dashboard", href: "/", icon: <HomeIcon className="h-5 w-5" /> },
  {
    label: "Upload Dataset",
    href: "/upload-dataset",
    icon: <DocumentArrowUpIcon className="h-5 w-5" />,
  },
  {
    label: "Visualizations",
    href: "/visualizations",
    icon: <ChartBarIcon className="h-5 w-5" />,
  },
  // New Infer Intents option
  {
    label: "Infer Intents",
    href: "/infer-intents",
    icon: <SparklesIcon className="h-5 w-5" />,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: <LightBulbIcon className="h-5 w-5" />,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: <UserIcon className="h-5 w-5" />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      setHasSession(!!data?.user);
      setSessionChecked(true);
    };
    checkSession();
  }, []);

  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggingOut(true);
    console.log("Logging out and clearing localStorage");
    localStorage.removeItem("uploadState");
    localStorage.removeItem("rfmClusters");
    localStorage.removeItem("rfmInterpretation");
    
    setTimeout(() => {
      setLoggingOut(false);
      router.push("/login");
    }, 1000);
  };

  if (!sessionChecked) {
    return null;
  }
  if (!hasSession) {
    return null;
  }
  if (loggingOut) {
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
    <aside className="w-64 bg-gradient-to-b from-[#190621] to-[#090523] border-r border-[#23283a] min-h-screen flex flex-col py-6 shadow-xl">
      <div className="flex flex-col items-center mb-8">
        <span className="text-2xl font-extrabold text-[#ffffff] tracking-wide mb-2">
          IntentMiner
        </span>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#a259e6] to-[#23283a] flex items-center justify-center text-white mb-2 overflow-hidden">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-10 h-10 object-contain"
          />
        </div>
      </div>
      <nav className="flex-1 w-full">
        <ul className="flex flex-col gap-1 w-full px-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-4 px-5 py-3 rounded-lg cursor-pointer transition-colors font-semibold text-[#e2e2e2] text-base ${
                    isActive
                      ? "bg-[#a259e6]/80 text-[#fff] shadow-lg"
                      : "hover:bg-[#a259e6]/40 hover:text-[#fff]"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mb-15 px-6">
        <button
          onClick={handleLogout}
          className="w-full px-5 py-3 rounded-lg  text-white font-bold text-base shadow-lg hover:bg-[#a259e6]/40 transition flex items-center"
        >
          <span className="mr-4">
            <FiLogOut className="w-5 h-5" />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
