"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Sidebar from "../components/Sidebar";
import { usePathname } from "next/navigation";
import ProtectedRoute from "./ProtectedRoute";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar =
    pathname.startsWith("/signup") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/(auth)");

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f7f8fa]`}
      >
        <ProtectedRoute>
          <div className="flex min-h-screen">
            {!hideSidebar && <Sidebar />}
            <div className="flex-1">{children}</div>
          </div>
        </ProtectedRoute>
      </body>
    </html>
  );
}
