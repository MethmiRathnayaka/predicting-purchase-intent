import React from "react";

export default function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 shadow-lg backdrop-blur-md bg-gradient-to-br from-[#3c1a5b]/80 to-[#2d0b3a]/80 border border-[#a259e6]/30"
      style={{ boxShadow: "0 8px 32px 0 rgba(162, 89, 230, 0.25)" }}
    >
      {children}
    </div>
  );
}
