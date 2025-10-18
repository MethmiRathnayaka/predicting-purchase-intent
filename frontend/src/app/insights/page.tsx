"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function InsightsSuggestions() {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! Ask me for recommendations based on your results.",
    },
  ]);
  const [input, setInput] = useState("");
  const [rfmClusters, setRfmClusters] = useState<any[]>(() => {
    const saved = localStorage.getItem("rfmClusters");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRfm = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      fetch(`http://localhost:8000/rfm-insights?user_id=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          setRfmClusters(data.clusters || []);
          localStorage.setItem(
            "rfmClusters",
            JSON.stringify(data.clusters || [])
          );
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    // Only fetch if not already in localStorage
    if (!localStorage.getItem("rfmClusters")) {
      fetchRfm();
    } else {
      setLoading(false);
    }
  }, []);

  // Looker Studio dynamic dataset id for Rule Mining
  const dataset_id_value = 1;
  const parameterId = "dataset_id";
  const reportId = "5841b56f-c70e-4aba-8bbb-49c8bcd2457f";
  const pageId = "GPoaF";
  const paramsObject: Record<string, string> = {};
  paramsObject[parameterId] = dataset_id_value.toString();
  const encodedParams = encodeURIComponent(JSON.stringify(paramsObject));
  const lookerStudioSrc = `https://lookerstudio.google.com/embed/reporting/${reportId}/page/${pageId}?params=${encodedParams}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c] py-8">
      <h2 className="text-3xl font-bold text-[#a259e6] mb-8">Insights</h2>
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* RFM Cluster Table */}
        <div className="bg-[#1a0824]/80 rounded-xl p-6 shadow-lg border border-[#a259e6]/40">
          <h3 className="text-xl font-semibold text-[#00e6e6] mb-4">
            RFM Segments
          </h3>
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
              <div className="text-[#b0b3b8]">Loading RFM insights...</div>
            </div>
          ) : rfmClusters.length === 0 ? (
            <div className="text-[#b0b3b8]">No RFM cluster data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-[#b0b3b8]">
                <thead className="text-xs uppercase bg-[#23283a] text-[#00e6e6]">
                  <tr>
                    <th className="px-4 py-2">Cluster</th>
                    <th className="px-4 py-2">Avg Recency</th>
                    <th className="px-4 py-2">Avg Frequency</th>
                    <th className="px-4 py-2">Avg Monetary</th>
                    <th className="px-4 py-2">Num Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {rfmClusters.map((c, idx) => (
                    <tr key={idx} className="border-b border-[#a259e6]/20">
                      <td className="px-4 py-2 font-bold">{c.Cluster}</td>
                      <td className="px-4 py-2">{c.Recency.toFixed(1)}</td>
                      <td className="px-4 py-2">{c.Frequency.toFixed(1)}</td>
                      <td className="px-4 py-2">{c.Monetary.toFixed(2)}</td>
                      <td className="px-4 py-2">{c.Num_Customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Rule Mining Results */}
        <div className="bg-[#1a0824]/80 rounded-xl p-6 shadow-lg border border-[#a259e6]/40">
          <h3 className="text-xl font-semibold text-[#00e6e6] mb-4">
            Rule Mining
          </h3>
          <iframe
            width="100%"
            height="220"
            src={lookerStudioSrc}
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          ></iframe>
          <div className="mt-4 text-center text-[#b0b3b8] text-sm">
            <span>
              <b>Tip:</b> Click on a row to see the intent behind why they were
              bought together.
            </span>
          </div>
        </div>
        {/* Time Series Forecasting Placeholder */}
        <div className="bg-[#1a0824]/80 rounded-xl p-6 shadow-lg border border-[#a259e6]/40">
          <h3 className="text-xl font-semibold text-[#00e6e6] mb-4">
            Time Series Forecasting
          </h3>
          <div className="flex flex-col items-center justify-center h-48 text-[#b0b3b8]">
            <span className="text-lg">
              [Time series chart or forecast output here]
            </span>
          </div>
        </div>
        {/* Churn Prediction Placeholder */}
        <div className="bg-[#1a0824]/80 rounded-xl p-6 shadow-lg border border-[#a259e6]/40">
          <h3 className="text-xl font-semibold text-[#00e6e6] mb-4">
            Churn Prediction
          </h3>
          <div className="flex flex-col items-center justify-center h-48 text-[#b0b3b8]">
            <span className="text-lg">
              [Churn prediction results or chart here]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
