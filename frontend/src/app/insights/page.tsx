"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";

const RfmPieChart = dynamic(() => import("@/components/RfmPieChart"), {
  ssr: false,
});

type ForecastRecord = {
  Category: string;
  Model: string;
  RMSE: number;
  MASE: number;
  sMAPE: number;
};

const categories = [
  "Electronics",
  "Home Appliances",
  "Clothing",
  "Books",
  "Beauty Products",
  "Sports",
];

export default function InsightsSuggestions() {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! Ask me for recommendations based on your results.",
    },
  ]);
  const [input, setInput] = useState("");
  const [rfmClusters, setRfmClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forecast data
  const [forecastData, setForecastData] = useState<ForecastRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Looker Studio embed link
  const [lookerStudioSrc, setLookerStudioSrc] = useState("");

  // Fetch RFM insights
  useEffect(() => {
    const fetchRfm = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (!userId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`http://localhost:8000/rfm-insights?user_id=${userId}`);
        const json = await res.json();
        setRfmClusters(json.clusters || []);
      } catch (error) {
        console.error("Failed to fetch RFM data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRfm();
  }, []);

  // Load forecast.json
  useEffect(() => {
    fetch("/forecast.json")
      .then((res) => res.json())
      .then((data) => setForecastData(data))
      .catch((err) => console.error("Error loading forecast data:", err));
  }, []);

  // Generate Looker Studio URL dynamically after user loads
  useEffect(() => {
    const fetchUserAndSetURL = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) return;

      const parameterId = "user_id";
      const reportId = "5841b56f-c70e-4aba-8bbb-49c8bcd2457f";
      const pageId = "GPoaF";

      const paramsObject: Record<string, string> = {};
      paramsObject[parameterId] = userId.toString();
      const encodedParams = encodeURIComponent(JSON.stringify(paramsObject));
      const url = `https://lookerstudio.google.com/embed/reporting/${reportId}/page/${pageId}?params=${encodedParams}`;
      setLookerStudioSrc(url);
    };

    fetchUserAndSetURL();
  }, []);

  // Category change handler
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setForecastLoading(true);
    setTimeout(() => {
      setSelectedCategory(newCategory);
      setForecastLoading(false);
    }, 600);
  };

  // Filter forecast data
  const selectedForecastRows = forecastData.filter(
    (row) => row.Category === selectedCategory
  );

  const formatCategoryForFilename = (cat: string) => cat.replace(/\s+/g, "_");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c] py-8">
      <h2 className="text-3xl font-bold text-[#a259e6] mb-8">Insights</h2>
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* RFM Cluster Table + Pie Chart */}
        <div className="bg-[#1a0824]/80 rounded-xl p-6 shadow-lg border border-[#a259e6]/40">
          <h3 className="text-xl font-semibold text-[#00e6e6] mb-4">RFM Segments</h3>
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
                  r="5"
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
            <>
              <div className="mb-6">
                <RfmPieChart clusters={rfmClusters} />
              </div>
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
            </>
          )}
        </div>

        {/* Rule Mining */}
        <div className="bg-[#1a0824]/80 rounded-xl p-6 shadow-lg border border-[#a259e6]/40">
          <h3 className="text-xl font-semibold text-[#00e6e6] mb-4">Rule Mining</h3>
          <button
            onClick={async () => {
              try {
                const { data } = await supabase.auth.getUser();
                const userId = data?.user?.id;
                if (!userId) {
                  alert("User not logged in.");
                  return;
                }

                const res = await fetch("http://localhost:8000/mining", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ user_id: userId }),
                });

                const dataRes = await res.json();
                alert(
                  dataRes.message ||
                    `Rule mining finished! Found ${dataRes.rules_count} rules.`
                );
                console.log("Rule mining response:", dataRes);
              } catch (err) {
                console.error("Failed to call rule mining API:", err);
                alert("Error: Could not connect to backend.");
              }
            }}
            className="mb-4 px-4 py-2 bg-[#a259e6] hover:bg-[#8c3fe0] text-white font-semibold rounded-lg shadow-md transition"
          >
            Run Rule Mining
          </button>

          {lookerStudioSrc ? (
            <iframe
              width="100%"
              height="450"
              src={lookerStudioSrc}
              allowFullScreen
              sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            ></iframe>
          ) : (
            <div className="text-[#b0b3b8]">Loading report...</div>
          )}

          <div className="mt-4 text-center text-[#b0b3b8] text-sm">
            <b>Tip:</b> Click on a row to see the intent behind why they were bought together.
          </div>
        </div>

        {/* Time Series Forecasting */}
        <div className="bg-[#1a0824]/80 rounded-xl p-6 shadow-lg border border-[#a259e6]/40 col-span-1 md:col-span-2">
          <h3 className="text-xl font-semibold text-[#00e6e6] mb-4">
            Time Series Forecasting
          </h3>

          <div className="mb-4">
            <label className="text-[#b0b3b8] mr-2">Select Category:</label>
            <select
              className="bg-[#23283a] text-[#b0b3b8] p-2 rounded"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {forecastLoading ? (
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
              <div className="text-[#b0b3b8]">Loading forecast data...</div>
            </div>
          ) : (
            <>
              {selectedForecastRows.length > 0 ? (
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full text-sm text-left text-[#b0b3b8]">
                    <thead className="text-xs uppercase bg-[#23283a] text-[#00e6e6]">
                      <tr>
                        <th className="px-4 py-2">Model</th>
                        <th className="px-4 py-2">RMSE</th>
                        <th className="px-4 py-2">MASE</th>
                        <th className="px-4 py-2">sMAPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedForecastRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-[#a259e6]/20">
                          <td className="px-4 py-2 font-bold">{row.Model}</td>
                          <td className="px-4 py-2">{row.RMSE.toFixed(2)}</td>
                          <td className="px-4 py-2">{row.MASE.toFixed(2)}</td>
                          <td className="px-4 py-2">{row.sMAPE.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-[#b0b3b8]">No forecast data available.</div>
              )}

              <div className="flex flex-wrap justify-center gap-8">
                <div className="flex flex-col items-center">
                  <p className="text-[#b0b3b8] mb-2">ACF Plot</p>
                  <img
                    src={`/assets_DSE/acf_${formatCategoryForFilename(selectedCategory)}.png`}
                    alt={`ACF ${selectedCategory}`}
                    className="max-w-xs rounded-lg border border-[#a259e6]/40"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[#b0b3b8] mb-2">PACF Plot</p>
                  <img
                    src={`/assets_DSE/pacf_${formatCategoryForFilename(selectedCategory)}.png`}
                    alt={`PACF ${selectedCategory}`}
                    className="max-w-xs rounded-lg border border-[#a259e6]/40"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
