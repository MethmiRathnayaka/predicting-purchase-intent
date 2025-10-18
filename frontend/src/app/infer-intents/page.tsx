"use client";

import React, { useState, useRef, useEffect } from "react";

export default function InferIntentsPage() {
  const [selected, setSelected] = useState<null | "full" | "sample">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("infer_selected") as "full" | "sample" | null) ||
        null
      );
    }
    return null;
  });
  const [showFullWarning, setShowFullWarning] = useState(false);
  // countdown is seconds left, but we store end timestamp in localStorage
  const [countdown, setCountdown] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const end = localStorage.getItem("infer_countdown_end");
      if (end) {
        const diff = Math.floor((Number(end) - Date.now()) / 1000);
        return diff > 0 ? diff : null;
      }
    }
    return null;
  });
  const [progress, setProgress] = useState<{
    batch: number;
    total: number;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("infer_progress");
      return val ? JSON.parse(val) : null;
    }
    return null;
  });
  const [running, setRunning] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("infer_running") === "true";
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const options = [
    {
      key: "full",
      label: "Full Dataset",
      desc: "Infer intents for the entire dataset.",
      icon: (
        <svg
          className="h-10 w-10"
          fill="none"
          stroke="#00e6e6"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="#00e6e6"
            strokeWidth="2"
          />
          <path d="M8 8h8v8H8z" stroke="#00e6e6" strokeWidth="2" />
        </svg>
      ),
    },
    {
      key: "sample",
      label: "Sample",
      desc: "Infer intents for a random sample.",
      icon: (
        <svg
          className="h-10 w-10"
          fill="none"
          stroke="#a259e6"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="#a259e6"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="4" stroke="#a259e6" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  // Countdown effect using end timestamp
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (typeof window !== "undefined") {
      const end = localStorage.getItem("infer_countdown_end");
      if (end) {
        const updateCountdown = () => {
          const diff = Math.floor((Number(end) - Date.now()) / 1000);
          if (diff > 0) {
            setCountdown(diff);
          } else {
            setCountdown(null);
            localStorage.removeItem("infer_countdown_end");
          }
        };
        updateCountdown();
        timer = setInterval(updateCountdown, 1000);
      } else {
        setCountdown(null);
      }
    }
    return () => clearInterval(timer);
  }, []);

  // Persist selected, running, and progress
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selected) {
        localStorage.setItem("infer_selected", selected);
      } else {
        localStorage.removeItem("infer_selected");
      }
    }
  }, [selected]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("infer_running", running ? "true" : "false");
    }
  }, [running]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (progress) {
        localStorage.setItem("infer_progress", JSON.stringify(progress));
      } else {
        localStorage.removeItem("infer_progress");
      }
    }
  }, [progress]);

  // Restore EventSource if running on mount
  useEffect(() => {
    if (running && !eventSourceRef.current && selected) {
      // Reconnect EventSource
      const dataset = "my_dataset"; // TODO: replace with actual dataset name or user input
      const sample_size = selected === "sample" ? 200 : 0;
      const url = `http://localhost:8000/intent/infer/stream?dataset=${dataset}${
        sample_size ? `&sample_size=${sample_size}` : ""
      }`;
      const es = new EventSource(url);
      eventSourceRef.current = es;
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "batch") {
            setProgress({ batch: data.batch, total: data.total });
          } else if (data.type === "done") {
            setRunning(false);
            es.close();
            eventSourceRef.current = null;
          } else if (data.type === "error") {
            setError(data.text || "Unknown error");
            setRunning(false);
            es.close();
            eventSourceRef.current = null;
          }
        } catch (e) {
          // ignore
        }
      };
      es.onerror = () => {
        setError("Connection error");
        setRunning(false);
        es.close();
        eventSourceRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format countdown as HH:MM:SS
  function formatCountdown(sec: number) {
    const h = Math.floor(sec / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c] p-8">
      <div className="max-w-xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-[#a259e6] mb-10 text-center">
          Select Inference Mode
        </h2>
        <p className="text-[#b0b3b8] text-base mb-10 text-center">
          Choose how you want to infer customer intents from your dataset.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                if (opt.key === "full") {
                  setShowFullWarning(true);
                } else {
                  setSelected("sample");
                }
              }}
              className={`flex-1 flex flex-col items-center gap-3 px-6 py-8 rounded-2xl border-2 transition-all shadow-lg font-semibold text-lg focus:outline-none
                ${
                  selected === opt.key
                    ? "bg-[#1a0824] border-[#00e6e6] text-[#00e6e6] scale-105"
                    : "bg-[#23283a]/60 border-[#44475a] text-[#b0b3b8] hover:border-[#a259e6] hover:text-[#a259e6]"
                }
              `}
              disabled={
                countdown !== null && countdown > 0 && opt.key === "full"
              }
            >
              {opt.icon}
              <span>{opt.label}</span>
              <span className="text-xs font-normal text-[#b0b3b8] text-center">
                {opt.desc}
              </span>
              {opt.key === "full" && countdown !== null && countdown > 0 && (
                <span className="text-xs text-red-400 mt-2">
                  Available in {formatCountdown(countdown)}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center mt-4 gap-4">
          <button
            className={`px-8 py-3 rounded-lg font-bold text-base shadow transition ${
              selected && !running
                ? "bg-[#00e6e6] text-[#23283a] hover:bg-[#00b3b3]"
                : "bg-[#23283a]/60 text-[#b0b3b8] cursor-not-allowed"
            }`}
            disabled={!selected || running}
            onClick={() => {
              if (selected === "full" && countdown !== null && countdown > 0) {
                // Should not happen due to button disable, but guard anyway
                return;
              }
              setProgress(null);
              setError(null);
              setRunning(true);
              if (typeof window !== "undefined") {
                localStorage.setItem("infer_running", "true");
              }
              // Example: dataset param is hardcoded, sample_size based on selection
              const dataset = "my_dataset"; // TODO: replace with actual dataset name or user input
              const sample_size = selected === "sample" ? 200 : 0;
              const url = `http://localhost:8000/intent/infer/stream?dataset=${dataset}${
                sample_size ? `&sample_size=${sample_size}` : ""
              }`;
              const es = new EventSource(url);
              eventSourceRef.current = es;
              es.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  if (data.type === "batch") {
                    setProgress({ batch: data.batch, total: data.total });
                  } else if (data.type === "done") {
                    setRunning(false);
                    es.close();
                    eventSourceRef.current = null;
                  } else if (data.type === "error") {
                    setError(data.text || "Unknown error");
                    setRunning(false);
                    es.close();
                    eventSourceRef.current = null;
                  }
                } catch (e) {
                  // ignore
                }
              };
              es.onerror = () => {
                setError("Connection error");
                setRunning(false);
                es.close();
                eventSourceRef.current = null;
              };
            }}
          >
            {running ? "Running..." : "Start"}
          </button>
          {/* Modal for Full Dataset warning */}
          {showFullWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className="bg-[#1a0824] rounded-2xl p-8 max-w-sm w-full shadow-2xl border-2 border-[#00e6e6] flex flex-col items-center">
                <h3 className="text-xl font-bold text-[#00e6e6] mb-4 text-center">
                  Full Dataset Inference
                </h3>
                <p className="text-[#b0b3b8] mb-6 text-center">
                  This may take up to{" "}
                  <span className="text-[#a259e6] font-semibold">one hour</span>{" "}
                  to complete.
                  <br />
                  Would you like to infer a sample instead?
                </p>
                <div className="flex gap-4 w-full justify-center">
                  <button
                    className="px-6 py-2 rounded-lg bg-[#a259e6] text-white font-semibold hover:bg-[#7c3aed] transition"
                    onClick={() => {
                      setSelected("sample");
                      setShowFullWarning(false);
                    }}
                  >
                    Yes, use sample
                  </button>
                  <button
                    className="px-6 py-2 rounded-lg bg-[#23283a] text-[#b0b3b8] font-semibold border border-[#44475a] hover:bg-[#23283a]/80 transition"
                    onClick={() => {
                      setShowFullWarning(false);
                      if (typeof window !== "undefined") {
                        const end = Date.now() + 3600 * 1000;
                        localStorage.setItem(
                          "infer_countdown_end",
                          end.toString()
                        );
                      }
                      setCountdown(3600); // 1 hour in seconds
                      setSelected(null); // force re-select after countdown
                    }}
                    disabled={countdown !== null && countdown > 0}
                  >
                    No, wait 1 hour
                  </button>
                </div>
              </div>
            </div>
          )}
          {progress && (
            <div className="w-full max-w-md mt-2">
              <div className="flex justify-between text-xs text-[#b0b3b8] mb-1">
                <span>
                  Progress: Batch {progress.batch} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-[#23283a]/60 rounded-full h-4">
                <div
                  className="bg-[#00e6e6] h-4 rounded-full transition-all"
                  style={{
                    width: `${(progress.batch / progress.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
          {error && <div className="text-red-400 mt-2">{error}</div>}
        </div>
      </div>
    </div>
  );
}
