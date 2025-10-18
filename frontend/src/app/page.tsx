"use client";

import Link from "next/link";
import {
  ChartBarIcon,
  DocumentArrowUpIcon,
  LightBulbIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { BanknotesIcon } from "@heroicons/react/24/solid";

export default function Home() {
  // Get today's date
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();

  // For this demo, calendar is always October 2025
  const calendarMonth = 9; // October (0-indexed)
  const calendarYear = 2025;

  const highlightToday =
    currentMonth === calendarMonth && currentYear === calendarYear;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c] flex flex-col">
      <main className="flex-1 flex flex-col gap-8 px-8 pb-8 bg-gradient-to-br from-[#0a0e1a] via-[#1a1e2a] to-[#23283a] mt-5">
        {/* Top Bar: Date, Weather, and Quick Info */}
        <div
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
          style={{
            backgroundImage: "url('/image.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "1rem",
            boxShadow: "0 8px 32px 0 rgba(10, 14, 26, 0.25)",
          }}
        >
          <div className=" rounded-2xl p-6 shadow flex flex-row justify-between min-h-[160px] col-span-2">
            <div className="flex flex-col justify-between">
              <div className="text-5xl font-extrabold text-[#ffffff] mb-2">
                {today.toLocaleDateString(undefined, { weekday: "long" })}
              </div>
              <div className="text-lg text-[#b0b3b8] mb-1">
                {today.toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="flex flex-col gap-1 text-[#e0e0e0] text-sm mt-2">
                <div>• 5 new orders placed this morning</div>
                <div>• Top product: Wireless Headphones</div>
                <div>• 2 customers churned this week</div>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between h-full">
              <div className="flex items-center gap-4 mb-2">
                <div className="text-4xl font-bold text-[#00e6e6]">15°C</div>
                <div className="flex flex-col text-xs text-[#b0b3b8] items-end">
                  <span>Thu</span>
                  <span>43% Humidity</span>
                </div>
                <img src="/moon.png" alt="Moon" className="w-10 h-10 ml-2" />
              </div>
              <div className="flex gap-4 text-[#b0b3b8] text-sm mt-2">
                <div className="flex flex-col items-center">
                  <span>36°C</span>
                  <span className="text-xs">Fri</span>
                </div>
                <div className="flex flex-col items-center">
                  <span>34°C</span>
                  <span className="text-xs">Sat</span>
                </div>
                <div className="flex flex-col items-center">
                  <span>35°C</span>
                  <span className="text-xs">Sun</span>
                </div>
                <button className="ml-2 text-[#a259e6] text-xl">&gt;</button>
              </div>
            </div>
          </div>
          {/* Calendar Card */}
          <div className=" rounded-2xl p-6 shadow flex flex-col min-h-[160px]">
            <div className="text-lg font-bold text-[#00e6e6] mb-2">
              Calendar
            </div>
            <div className="bg-[#0d132e] rounded-2xl p-4 shadow flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[#f8f6f0] font-semibold text-lg">
                  October 2025
                </span>
                <button className="px-2 py-1 rounded bg-[#a259e6]/60 text-[#fff]">
                  Month
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => (
                    <span
                      key={day}
                      className="text-[#b0b3b8] text-xs text-center font-bold"
                    >
                      {day}
                    </span>
                  )
                )}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(31)].map((_, i) => {
                  const date = i + 1;
                  const isToday = highlightToday && date === currentDay;
                  return (
                    <button
                      key={date}
                      className={`rounded-full w-8 h-8 flex items-center justify-center font-semibold transition border-2 ${
                        isToday
                          ? "bg-[#00e6e6] border-[#00e6e6] text-[#23283a] shadow-lg"
                          : "bg-[#23283a]/60 border-[#44475a] text-[#b0b3b8] hover:bg-[#a259e6]/30 hover:text-[#f8f6f0]"
                      }`}
                    >
                      {date}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* Dashboard Cards Section */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/upload-dataset" className="block col-span-1">
            <DashboardCard
              label="Upload Dataset"
              desc="Upload your retail dataset for the analysis."
              icon={<DocumentArrowUpIcon className="h-8 w-8" />}
            />
          </Link>
          <Link href="/visualizations" className="block col-span-1">
            <DashboardCard
              label="Visualize Data"
              desc="See trends, patterns, and insights visually."
              icon={<ChartBarIcon className="h-8 w-8" />}
            />
          </Link>
          <Link href="/infer-intents" className="block col-span-1">
            <DashboardCard
              label="Infer Intents"
              desc="Discover customer purchase intents."
              icon={<BanknotesIcon className="h-8 w-8" />}
            />
          </Link>
          <Link href="/insights-suggestions" className="block col-span-1">
            <DashboardCard
              label="Insights"
              desc="Get actionable insights."
              icon={<LightBulbIcon className="h-8 w-8" />}
            />
          </Link>
          <Link href="/profile" className="block col-span-1">
            <DashboardCard
              label="Profile"
              desc="View your profile."
              icon={<UserIcon className="h-8 w-8" />}
            />
          </Link>
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  label,
  desc,
  icon,
}: {
  label: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-6 px-6 py-6 rounded-2xl border-0 shadow-xl bg-gradient-to-r from-[#531063] via-[#2d0b3a] to-[#240634] hover:from-[#2d0b3a] hover:to-[#23283a] transition-all duration-300 cursor-pointer group relative overflow-hidden"
      style={{ minHeight: 110 }}
    >
      <div className="flex-shrink-0 bg-[#181c2f] rounded-xl p-4 shadow group-hover:bg-[#a259e6] transition-colors duration-300">
        {icon}
      </div>
      <div className="flex flex-col items-start z-10">
        <span className="font-extrabold text-xl text-[#f8f6f0] group-hover:text-[#00e6e6] drop-shadow mb-1 transition-colors duration-300">
          {label}
        </span>
        <span className="text-base text-[#b0b3b8] group-hover:text-[#e0e0e0] transition-colors duration-300">
          {desc}
        </span>
      </div>
      {/* Decorative blurred glow */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-[#a259e6] opacity-20 rounded-full blur-2xl pointer-events-none group-hover:opacity-40 transition-all duration-300" />
    </div>
  );
}
