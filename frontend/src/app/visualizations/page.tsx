"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Visualizations() {
  const [lookerStudioSrc, setLookerStudioSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buildLookerURL = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;

        if (!userId) {
          setLoading(false);
          return;
        }

        // Looker Studio report details
        const parameterId = "user_id";
        const reportId = "9a33ca61-f281-4741-9008-5bf157ba6e13"; // your report ID
        const pageId = "1p5bF"; // your page ID

        // Build params object
        const paramsObject: Record<string, string> = {};
        paramsObject[parameterId] = userId.toString();

        // Encode the params for URL
        const encodedParams = encodeURIComponent(JSON.stringify(paramsObject));

        // Construct final Looker Studio URL
        const src = `https://lookerstudio.google.com/embed/reporting/${reportId}/page/${pageId}?params=${encodedParams}`;
        setLookerStudioSrc(src);
      } catch (error) {
        console.error("Error building Looker Studio URL:", error);
      } finally {
        setLoading(false);
      }
    };

    buildLookerURL();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c]">
      <h2 className="text-3xl font-bold mb-8 text-[#a259e6]">Visualizations</h2>

      <div
        className="rounded-2xl shadow-lg border-4 border-[#a259e6] bg-[#23283a]/80 p-6"
        style={{ boxShadow: "0 8px 32px 0 rgba(162, 89, 230, 0.25)" }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <svg
              className="animate-spin h-8 w-8 text-[#00e6e6] mb-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="#00e6e6"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="#00e6e6"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <div className="text-[#b0b3b8]">Loading visualization...</div>
          </div>
        ) : lookerStudioSrc ? (
          <>
            <iframe
              width="850"
              height="600"
              src={lookerStudioSrc}
              frameBorder="0"
              style={{ border: 0, borderRadius: "1rem", background: "#23283a" }}
              allowFullScreen
              sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            ></iframe>
            <div className="mt-4 text-center text-[#b0b3b8] text-sm">
              <span>
                <b>Tip:</b> To open Looker Studio and draw your own charts,
                click the <b>Looker Studio</b> text at the bottom right of the
                report.
              </span>
            </div>
          </>
        ) : (
          <div className="text-[#b0b3b8]">
            Could not load visualization — please log in.
          </div>
        )}
      </div>
    </div>
  );
}
