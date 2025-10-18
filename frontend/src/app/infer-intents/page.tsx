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
  // Track the absolute end timestamp so the effect starts immediately when set
  const [countdownEnd, setCountdownEnd] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const end = localStorage.getItem("infer_countdown_end");
      return end ? Number(end) : null;
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
  const [sampleResults, setSampleResults] = useState<
    Array<{ product: string; intent: string }>
  >([]);
  const [samplePage, setSamplePage] = useState(0); // 0-based page index
  const SAMPLE_PAGE_SIZE = 10;
  // Simulation refs for dummy inference
  const DUMMY_MODE = true; // set to true to run locally without backend
  const simTimerRef = useRef<number | null>(null);
  const simBatchRef = useRef<number>(0);
  const simTotalRef = useRef<number>(0);

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
  // Runs on mount and whenever `countdown` changes so an interval starts immediately
  useEffect(() => {
    let timer: number | undefined;
    const end = countdownEnd;
    if (end) {
      const updateCountdown = () => {
        const diff = Math.floor((end - Date.now()) / 1000);
        if (diff > 0) {
          setCountdown(diff);
        } else {
          setCountdown(null);
          setCountdownEnd(null);
          if (typeof window !== "undefined")
            localStorage.removeItem("infer_countdown_end");
        }
      };
      updateCountdown();
      timer = window.setInterval(updateCountdown, 1000);
    } else {
      setCountdown(null);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [countdownEnd]);

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

  // Stop the countdown (cancel the pending full-dataset wait)
  function stopCountdown() {
    setCountdown(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("infer_countdown_end");
    }
    // return to initial selection state
    setSelected(null);
    setCountdownEnd(null);
  }

  // Stop the running inference (close EventSource and clear state)
  function stopInference() {
    // Stop backend EventSource if present
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        // ignore
      }
      eventSourceRef.current = null;
    }
    // Stop simulated timer if running
    if (simTimerRef.current) {
      window.clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    // Reset simulation state
    simBatchRef.current = 0;
    simTotalRef.current = 0;
    // Reset UI state back to initial
    setRunning(false);
    setProgress(null);
    setError(null);
    setSelected(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("infer_running");
      localStorage.removeItem("infer_progress");
      localStorage.removeItem("infer_countdown_end");
    }
    // clear any sample results shown
    setSampleResults([]);
  }

  // Start a local dummy inference simulation
  function startDummyInference(mode: "full" | "sample") {
    // Clear prior sample results and reset view
    setSampleResults([]);
    setSamplePage(0);
    // Configure simulation: total batches and interval
    const total = mode === "sample" ? 4 : 30; // sample: 4 batches
    const intervalMs = mode === "sample" ? Math.floor(10000 / 4) : 1200; // sample total ~10s
    simTotalRef.current = total;
    simBatchRef.current = 0;
    setProgress({ batch: 0, total });
    setRunning(true);
    if (typeof window !== "undefined")
      localStorage.setItem("infer_running", "true");

    simTimerRef.current = window.setInterval(() => {
      simBatchRef.current += 1;
      setProgress({ batch: simBatchRef.current, total });
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "infer_progress",
          JSON.stringify({ batch: simBatchRef.current, total })
        );
      }
      // When complete
      if (simBatchRef.current >= total) {
        if (simTimerRef.current) {
          window.clearInterval(simTimerRef.current);
          simTimerRef.current = null;
        }
        setRunning(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("infer_running", "false");
        }
        // If this was a sample run, generate sample results and display them
        if (mode === "sample") {
          const products = [
            "'Ketchup', 'Shaving Cream', 'Light Bulbs'",
            "'Ice Cream', 'Milk', 'Olive Oil', 'Bread', 'Potatoes'",
            "'Spinach",
            "'Tissues', 'Mustard'",
            "'Dish Soap'",
            "'Toothpaste', 'Chicken'",
            "'Honey', 'BBQ Sauce', 'Soda', 'Olive Oil', 'Garden Hose'",
            "'Syrup', 'Trash Cans', 'Pancake Mix', 'Water', 'Mayonnaise'",
            "'Insect Repellent'",
            "'Soap', 'Baby Wipes', 'Soda'",
            "'Extension Cords', 'Soda', 'Water', 'Garden Hose', 'Cleaning Spray'",
            "'Tea', 'Paper Towels', 'Spinach'",
            "'Salmon', 'Shaving Cream'",
            "'Trash Bags', 'Apple', 'Mop', 'Hair Gel'",
            "'Razors', 'Laundry Detergent', 'Beef'",
            "'Cereal', 'Vinegar', 'Bath Towels'",
            "'Air Freshener', 'Feminine Hygiene Products'",
            "'Power Strips', 'Honey', 'Ketchup', 'Tea', 'Shampoo'",
            "'Mustard', 'Dustpan'",
            "'Coffee' ",
          ];
          const intents = [
            "Household restock ",
            " Family dinner prep",
            "Smoothie prep",
            "Picnic prep",
            "Dishwashing",
            "Meal prep",
            "Backyard BBQ",
            "Weekend brunch prep",
            " Outdoor camping",
            "Household refreshments",
            "Outdoor party prep",
            "Healthy snacking",
            "Dinner prep",
            "Household maintenance",
            "Meal prep and grooming",
            "Household restocking",
            "Personal care refresh",
            "general groceries",
            "Hot dog meal",
          ];
          // Generate 200 sample rows
          const rows = Array.from({ length: 200 }).map((_, i) => ({
            product: products[i % products.length],
            intent: intents[i % intents.length],
          }));
          setSampleResults(rows);
        }
      }
    }, intervalMs);
  }
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#000000] via-[#080645] to-[#260c2c] p-8">
      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-[#a259e6] mb-10 text-center">
          Select Inference Mode
        </h2>
        <p className="text-[#b0b3b8] text-base mb-10 text-center">
          Choose how you want to infer customer intents from your dataset.
        </p>
        {/* Prominent countdown banner when waiting for full dataset availability */}
        {countdown !== null && countdown > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-[#25102b] border border-[#a259e6]/40 text-center">
            <div className="text-sm text-[#b0b3b8]">
              Full dataset inference will be available in
              <span className="ml-2 font-mono text-[#00e6e6]">
                {formatCountdown(countdown)}
              </span>
            </div>
            <div className="mt-2">
              <button
                className="px-3 py-1 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
                onClick={() => stopCountdown()}
              >
                Cancel wait
              </button>
            </div>
          </div>
        )}
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
              // Dummy mode: simulate locally
              if (DUMMY_MODE) {
                startDummyInference(selected as "full" | "sample");
                return;
              }
              // Real backend path (unchanged)
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
          {/* Show stop countdown button when waiting for the 1-hour hold */}
          {/* {countdown !== null && countdown > 0 && (
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
              onClick={() => stopCountdown()}
            >
              Cancel Wait
            </button>
          )} */}
          {/* Show stop inference button when running */}
          {running && (
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
              onClick={() => stopInference()}
            >
              Stop Inference
            </button>
          )}
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
                        setCountdownEnd(end);
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

          {sampleResults && sampleResults.length > 0 && (
            <div className="w-full max-w-6xl mt-6 mx-auto bg-[#0f0b13] p-6 rounded-xl border border-[#44475a]">
              <h4 className="text-lg font-semibold text-[#a259e6] mb-3">
                Showing {samplePage * SAMPLE_PAGE_SIZE + 1} -{" "}
                {Math.min(
                  (samplePage + 1) * SAMPLE_PAGE_SIZE,
                  sampleResults.length
                )}{" "}
                of {sampleResults.length} Results
              </h4>
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm text-left rounded-xl overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(180deg, #080645 0%, #260c2c 100%)",
                  }}
                >
                  <thead>
                    <tr className="bg-[#1a0824]">
                      <th className="px-6 py-3 font-semibold text-[#00e6e6] text-left">
                        #
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#a259e6] text-left">
                        Product
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#00e6e6] text-left">
                        Inferred Intent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleResults
                      .slice(
                        samplePage * SAMPLE_PAGE_SIZE,
                        (samplePage + 1) * SAMPLE_PAGE_SIZE
                      )
                      .map((r, idx) => (
                        <tr
                          key={samplePage * SAMPLE_PAGE_SIZE + idx}
                          className={
                            idx % 2 === 0
                              ? "bg-[#23283a]/60"
                              : "bg-[#0b0a0f]/80"
                          }
                        >
                          <td className="px-6 py-3 text-[#00e6e6] font-medium">
                            {samplePage * SAMPLE_PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-6 py-3 text-[#b0b3b8]">
                            {r.product}
                          </td>
                          <td className="px-6 py-3 text-[#a259e6]">
                            {r.intent}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center items-center gap-6 mt-4">
                <button
                  className="px-4 py-2 rounded-lg bg-[#23283a] text-[#b0b3b8] font-semibold border border-[#44475a] hover:bg-[#23283a]/80 transition"
                  onClick={() => setSamplePage((p) => Math.max(0, p - 1))}
                  disabled={samplePage === 0}
                  aria-label="Previous 10"
                >
                  <span className="text-2xl">&#8592;</span> Prev
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-[#23283a] text-[#b0b3b8] font-semibold border border-[#44475a] hover:bg-[#23283a]/80 transition"
                  onClick={() =>
                    setSamplePage((p) =>
                      Math.min(
                        Math.floor(
                          (sampleResults.length - 1) / SAMPLE_PAGE_SIZE
                        ),
                        p + 1
                      )
                    )
                  }
                  disabled={
                    (samplePage + 1) * SAMPLE_PAGE_SIZE >= sampleResults.length
                  }
                  aria-label="Next 10"
                >
                  Next <span className="text-2xl">&#8594;</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
